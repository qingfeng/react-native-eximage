## Getting started

1. Drag & Drop the `{projectDir}/node_modules/react-native-eximage/RCTExImage.xcodeproj` into your project
2. Add `libRCTExImage.a` to your project's `Build Phases > Link Binary With Libraries`
3. `cd {projectDir}/node_modules/react-native-eximage`
4. `git clone https://github.com/rs/SDWebImage.git`
5. Drag & Drop the `SDWebImage.xcodeproj` file under `RCTExImage.xcodeproj`
6. Rebuild SDWebImage automagically if you ever decide to assimilate some changes in the future from git ... then goto `RCTExImage.xcodeproj > Build Phase > Target Dependencies > + > SDWebImage`.
7. `RCTExImage.xcodeproj > Build Phase > Link Bindary With Libraries > +` Add `libSDWebImage.a` and `ImageIO.framework`.
8. `RCTExImage.xcodeproj > Build Settings > Header Search Paths` Look for `Header Search Paths` and make sure it contains `$(SRCROOT)/SDWebImage` - mark as `recursive`. 

**thumbnail generate**: http://www.mindsea.com/2012/12/downscaling-huge-alassets-without-fear-of-sigkill/
