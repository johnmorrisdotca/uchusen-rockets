# Security

This package runs in your page or on your server. Beyond loading a painted model's `.glb` from the address you give it, it makes no network requests and keeps nothing outside the page it is on.

The attributes are read as text and checked against tables: an unknown rocket, variant or part is refused by name, an unknown look, view or show falls back to the default, and the `build` attribute is read as JSON and checked by `check`. The element works under a strict content security policy: it needs `connect-src` and `img-src blob:` for a painted model, and no inline script or style.

If you find a way to make it do something it should not, such as text that gets out of a drawing into the page, please write to john@johnmorris.ca rather than opening a public issue. Reports are read and kept confidential, and a fix is released as soon as there is one.

Only the latest version is supported. It needs Node 22 or later on a server; in a browser, any current one.
