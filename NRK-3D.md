# NRK 3D showcase

Original stylized six-wheel utility platform modeled from the user-supplied reference image. This is a visual approximation, not a dimensional or engineering replica.

- Model source: assets/nrk-model.js. Six independent wheel groups with sidewalls, rims, hubs, spokes and instanced tread blocks.
- Viewer: assets/nrk-3d.js; locally vendored three.js 0.180.0 (MIT license in assets/vendor/three-LICENSE.txt). No remote model service.
- Wheel rotation uses distance/radius, with fixed chassis and axles. Global animation pause and reduced motion stop rotation. Hidden slides do not render.
- Drag or use arrow keys to inspect the model; Home resets the camera. Auto slideshow waits while dragging.
- Unsupported/lost WebGL falls back to the original still image. Equipment summary cards retain the supplied image without the previous raster-wheel manipulation.
- Downloadable animated model: assets/equipment/nrk-platform-3d.glb; glTF 2.0, one 2.8-second wheel animation with six channels.

Validation: model readiness, wheel movement and pause, WebGL fallback, manual/automatic slideshow selection and mobile overflow are covered by tests/site-assistant.cjs.

## Aircraft models

assets/aircraft-models.js builds two original visual approximations: Vampire with six red propellers and Heavy Shot with four propellers, matching the existing reference photos. Each model has separate fixed motor housings, arms, landing gear and rotating propeller groups. Adjacent rotors alternate direction for the decorative animation. The shared viewer applies the same camera controls, pause, reduced motion, hidden-slide and WebGL fallback behavior. Animated GLB exports are assets/equipment/vampire-3d.glb and assets/equipment/heavy-shot-3d.glb. No engineering accuracy is claimed.
