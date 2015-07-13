'use strict';

var EdgeInsetsPropType = require('EdgeInsetsPropType');
var ImageResizeMode = require('ImageResizeMode');
var ImageStylePropTypes = require('ImageStylePropTypes');
var NativeMethodsMixin = require('NativeMethodsMixin');
var NativeModules = require('NativeModules');
var PropTypes = require('ReactPropTypes');
var React = require('React');
var ReactNativeViewAttributes = require('ReactNativeViewAttributes');
var StyleSheet = require('StyleSheet');
var StyleSheetPropType = require('StyleSheetPropType');

var flattenStyle = require('flattenStyle');
var invariant = require('invariant');
var merge = require('merge');
var requireNativeComponent = require('requireNativeComponent');
var resolveAssetSource = require('resolveAssetSource');
var verifyPropTypes = require('verifyPropTypes');
var warning = require('warning');

var ExImage = React.createClass({
  propTypes: {
    /**
     * `uri` is a string representing the resource identifier for the image, which
     * could be an http address, a local file path, or the name of a static image
     * resource (which should be wrapped in the `require('image!name')` function).
     */
    source: PropTypes.shape({
      uri: PropTypes.string,
    }),
    /**
     * A static image to display while downloading the final image off the
     * network.
     */
    defaultSource: PropTypes.shape({
      uri: PropTypes.string,
    }),
    /**
     * Whether this element should be revealed as an accessible element.
     */
    accessible: PropTypes.bool,
    /**
     * Custom string to display for accessibility.
     */
    accessibilityLabel: PropTypes.string,
    /**
     * When the image is resized, the corners of the size specified
     * by capInsets will stay a fixed size, but the center content and borders
     * of the image will be stretched.  This is useful for creating resizable
     * rounded buttons, shadows, and other resizable assets.  More info on
     * [Apple documentation](https://developer.apple.com/library/ios/documentation/UIKit/Reference/UIImage_Class/index.html#//apple_ref/occ/instm/UIImage/resizableImageWithCapInsets)
     */
    capInsets: EdgeInsetsPropType,
    /**
     * Determines how to resize the image when the frame doesn't match the raw
     * image dimensions.
     */
    resizeMode: PropTypes.oneOf(['cover', 'contain', 'stretch']),
    style: StyleSheetPropType(ImageStylePropTypes),
    /**
     * A unique identifier for this element to be used in UI Automation
     * testing scripts.
     */
    testID: PropTypes.string,
    /**
     * Invoked on mount and layout changes with
     *
     *   {nativeEvent: { layout: {x, y, width, height}}}.
     */
     onLayout: PropTypes.func,

     loadingBackgroundColor: PropTypes.string,
     loadingForegroundColor: PropTypes.string,
     onComplete: PropTypes.func,
     onWillLoad: PropTypes.func,

  },

  getDefaultProps: function() {
    return {
      loadingBackgroundColor: '#E3E3E3',
      loadingForegroundColor: '#F53341',
    };
  },

  statics: {
    resizeMode: ImageResizeMode,
  },

  mixins: [NativeMethodsMixin],

  /**
   * `NativeMethodsMixin` will look for this when invoking `setNativeProps`. We
   * make `this` look like an actual native component class.
   */
  viewConfig: {
    uiViewClassName: 'UIView',
    validAttributes: ReactNativeViewAttributes.UIView
  },

  componentDidMount: function() {
    this._onChange = this._onChange.bind(this);
  },

  _onChange: function(event) {
    if (this.props.onComplete && event.nativeEvent.type === 'onComplete') {
      this.props.onComplete(event.nativeEvent.done);
    } else if (this.props.onWillLoad && event.nativeEvent.type === 'onWillLoad') {
      this.props.onWillLoad();
    }
  },

  render: function() {
    for (var prop in nativeOnlyProps) {
      if (this.props[prop] !== undefined) {
        console.warn('Prop `' + prop + ' = ' + this.props[prop] + '` should ' +
          'not be set directly on Image.');
      }
    }
    var source = resolveAssetSource(this.props.source) || {};

    var {width, height} = source;
    var style = flattenStyle([{width, height}, styles.base, this.props.style]);
    invariant(style, 'style must be initialized');

    var isNetwork = source.uri && source.uri.match(/^https?:/);
    invariant(
      !(isNetwork && source.isStatic),
      'static image uris cannot start with "http": "' + source.uri + '"'
    );
    var isStored = !source.isStatic && !isNetwork;
    var RawImage = isNetwork ? RCTExNetworkImage : RCTExStaticImage;

    if (this.props.style && this.props.style.tintColor) {
      warning(RawImage === RCTExStaticImage, 'tintColor style only supported on static images.');
    }
    var resizeMode = this.props.resizeMode || style.resizeMode;
    var contentModes = NativeModules.UIManager.UIView.ContentMode;
    var contentMode;
    if (resizeMode === ImageResizeMode.stretch) {
      contentMode = contentModes.ScaleToFill;
    } else if (resizeMode === ImageResizeMode.contain) {
      contentMode = contentModes.ScaleAspectFit;
    } else { // ImageResizeMode.cover or undefined
      contentMode = contentModes.ScaleAspectFill;
    }

    var nativeProps = merge(this.props, {
      style,
      contentMode,
      tintColor: style.tintColor,
    });
    if (isStored) {
      nativeProps.imageInfo = {
        imageTag: source.uri,
        prezSize: {
          width: style.width || 0,
          height: style.height || 0,
        }
      }
    } else {
      nativeProps.src = source.uri;
    }
    if (this.props.defaultSource) {
      nativeProps.defaultImageSrc = this.props.defaultSource.uri;
    }
    return <RawImage {...nativeProps} onChange={this._onChange}/>;
  }
});

var styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: '#EFEFEF',
  },
});

var RCTExNetworkImage = requireNativeComponent('RCTExNetworkImage', null);
var RCTExStaticImage = requireNativeComponent('RCTExStaticImage', null);

var nativeOnlyProps = {
  src: true,
  defaultImageSrc: true,
  imageTag: true,
  contentMode: true,
};
if (__DEV__) {
  verifyPropTypes(ExImage, RCTExStaticImage.viewConfig, nativeOnlyProps);
  verifyPropTypes(ExImage, RCTExNetworkImage.viewConfig, nativeOnlyProps);
}

module.exports = ExImage;
