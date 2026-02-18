

## Add Custom Favicon

### What changes

Add an explicit `<link rel="icon">` tag in `index.html` pointing to your existing `/public/favicon.ico` file, ensuring browsers use your custom icon instead of any default.

### Implementation

**File: `index.html`**

Add the following line after the `<meta charset>` tag (around line 4), before the title:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

This is the only change needed. The file `public/favicon.ico` already exists in your project, and adding this explicit reference ensures all browsers pick it up and no default/Lovable branding favicon is used.

### Files changed

- `index.html` -- add one `<link rel="icon">` tag

