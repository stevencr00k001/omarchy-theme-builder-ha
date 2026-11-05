# Changelog

## 1.1.5
- Fix panel layout at medium widths (e.g. a ~1000–1280px tablet in landscape). Between the `lg` and `xl`
  breakpoints the preview and theme list were `position: sticky` while the controls column sat in a
  second grid row below them, so the controls scrolled up underneath the pinned preview and theme list
  ("a page stuck underneath"). Sticky now applies only in the three-column `xl` layout; at `lg` the
  controls stack under the preview in the second column. Rebuilt the panel.

## 1.1.4
- Apply a complete theme and drop the download UI.
