//
//  RCTExNetworkImage.m
//  RCTExImage
//
//  Created by 郭栋 on 15/7/9.
//  Copyright (c) 2015年 guodong. All rights reserved.
//

#import "RCTExNetworkImage.h"

#import <UIKit/UIKit.h>
#import <SDWebImage/UIImageView+WebCache.h>

#import "RCTConvert.h"
#import "RCTUtils.h"
#import "UIView+React.h"
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"

#import "CircleProgressIndicator.h"

#define kProgressSize 100

@implementation RCTExNetworkImage
{
    RCTBridge *_bridge;
    
    UIImageView *_imageView;
    NSURL *_imageURL;
    id<SDWebImageOperation> _downloadToken;
    BOOL _deferred;
    NSURL *_deferredImageURL;
    NSUInteger _deferSentinel;
    
    CircleProgressIndicator *_progressIndicator;
    UITapGestureRecognizer *_gestureReognizer;
    
    BOOL _canRetry;
}

@synthesize imageURL = _imageURL;

- (instancetype)initWithBridge:(RCTBridge *)bridge {
    self = [super initWithFrame:CGRectZero];
    if (self) {
        _bridge = bridge;
        _canRetry = NO;
        
        _gestureReognizer = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(handleSingleTap:)];
        [self addGestureRecognizer:_gestureReognizer];
        
        _imageView = [[UIImageView alloc] initWithFrame:CGRectZero];
        _imageView.contentMode = UIViewContentModeScaleAspectFill;
        
        _progressIndicator = [[CircleProgressIndicator alloc] init];
        [self addSubview:_progressIndicator];
    }
    return self;
}

- (void)layoutSubviews {
    [super layoutSubviews];
    if (_imageView.superview == self) {
        _imageView.frame = self.bounds;
    }
    if (_progressIndicator.superview == self) {
        _progressIndicator.frame = self.bounds;
    }
}

- (void)reactSetFrame:(CGRect)frame
{
    [super reactSetFrame:frame];
}

- (void)handleSingleTap:(UITapGestureRecognizer *)recognizer {
    [self retry];
}

- (void)setLoadingBackgroundColor:(UIColor *)loadingBackgroundColor {
    _progressIndicator.backgroundColor = loadingBackgroundColor;
}

- (void)setLoadingForegroundColor:(UIColor *)loadingForegroundColor {
    _progressIndicator.foregroundColor = loadingForegroundColor;
}

- (void)setImageURL:(NSURL *)imageURL {
    _canRetry = NO;
    if (![imageURL isEqual:_imageURL] && _downloadToken) {
        [_downloadToken cancel];
        _downloadToken = nil;
    }
    
    if (_deferred) {
        _deferredImageURL = imageURL;
    } else {
        if (!imageURL) {
            [_imageView removeFromSuperview];
            return;
        }
        
        _imageURL = imageURL;
        
        [_imageView removeFromSuperview];
        [_progressIndicator setProgress:0.0];
        [self addSubview:_progressIndicator];
        
        NSDictionary *event = @{
                                @"target": self.reactTag,
                                @"type": @"onWillLoad"
                                };
        [_bridge.eventDispatcher sendInputEventWithName:@"topChange" body:event];
        
        SDWebImageManager *manager = [SDWebImageManager sharedManager];
#if DEBUG
        SDImageCache *imageCache = [SDImageCache sharedImageCache];
        [imageCache removeImageForKey:[manager cacheKeyForURL:imageURL]];
#endif
        [manager downloadImageWithURL:_imageURL
                              options:SDWebImageRetryFailed
                             progress:^(NSInteger receivedSize, NSInteger expectedSize) {
                                 CGFloat progress = ((CGFloat)receivedSize) / expectedSize;
                                 [_progressIndicator setProgress:progress];
                             }
                            completed:^(UIImage *image, NSError *error, SDImageCacheType cacheType, BOOL finished, NSURL *imageURL) {
                                if (image) {
                                    _imageView.image = image;
                                    [_progressIndicator removeFromSuperview];
                                    [self addSubview:_imageView];
                                    
                                    NSDictionary *event = @{
                                                            @"target": self.reactTag,
                                                            @"type": @"onComplete",
                                                            @"done": @(YES)
                                                            };
                                    [_bridge.eventDispatcher sendInputEventWithName:@"topChange" body:event];
                                } else {
                                    _canRetry = YES;
                                    [_progressIndicator removeFromSuperview];
                                    [_imageView removeFromSuperview];
                                    NSDictionary *event = @{
                                                            @"target": self.reactTag,
                                                            @"type": @"onComplete",
                                                            @"done": @(NO)
                                                            };
                                    [_bridge.eventDispatcher sendInputEventWithName:@"topChange" body:event];
                                }
                            }];
    }
}

- (void)retry {
    if (_canRetry) {
        [self setImageURL:_imageURL];
    }
}

- (void)willMoveToWindow:(UIWindow *)newWindow
{
    [super willMoveToWindow:newWindow];
    if (newWindow != nil && _deferredImageURL) {
        // Immediately exit deferred mode and restore the imageURL that we saved when we went offscreen.
        [self setImageURL:_deferredImageURL];
        _deferredImageURL = nil;
    }
}

- (void)_enterDeferredModeIfNeededForSentinel:(NSUInteger)sentinel
{
    if (self.window == nil && _deferSentinel == sentinel) {
        _deferred = YES;
        [_downloadToken cancel];
        _downloadToken = nil;
        _deferredImageURL = _imageURL;
        _imageURL = nil;
    }
}

- (void)didMoveToWindow
{
    [super didMoveToWindow];
    if (self.window == nil) {
        __weak RCTExNetworkImage *weakSelf = self;
        NSUInteger sentinelAtDispatchTime = ++_deferSentinel;
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC), dispatch_get_main_queue(), ^(void){
            [weakSelf _enterDeferredModeIfNeededForSentinel:sentinelAtDispatchTime];
        });
    }
}

@end
