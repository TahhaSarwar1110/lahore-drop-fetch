# Project architecture

- Keep iOS app icons in the native AppIcon asset catalog and Android icons in density-specific launcher resources, derived from the approved app icon; native launchers require platform-specific sizes and adaptive foreground safe areas.
- Keep legal and data-deletion information on public pages linked from the shared footer so customers can access them without signing in; deletion requests use the support contact unless an actual deletion workflow is implemented.