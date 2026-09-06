# Working collection designs

These are live views of the same saved cards, not mock screenshots.

- [Album](https://m1l3s99.github.io/WorkoutMoneyApp/?collectionDesign=album#collections): tactile paper, ring binding, green cover, transparent sleeves and two-column cards.
- [Gallery](https://m1l3s99.github.io/WorkoutMoneyApp/?collectionDesign=gallery#collections): light, minimal gallery with larger art and quiet empty slots.
- [Journal](https://m1l3s99.github.io/WorkoutMoneyApp/?collectionDesign=journal#collections): editorial paper journal with mounted cards and generous readable captions.

Use the view switcher to compare them. The preference is stored separately in `repdrop-collection-design-v1`; exercise and reward data remain in the existing storage key. A view URL takes precedence over the saved preference. All three views support collection tabs, brief page turns, all/collected filtering and card inspection with previous/next controls. Unknown cards stay hidden. The selected collection still controls capsule drops.

## Generated asset

Built-in image generation was used (not the CLI). Final asset: `assets/repdrop/album-paper-v1.png`. Existing card art and card backs are reused. Rings, sleeves, tabs, labels, progress, cards and buttons are responsive HTML/CSS, not baked into the image.

Final prompt:

> Use case: stylized-concept. Asset type: seamless paper surface texture for a real mobile collection album interface, 1024x1024. Primary request: extremely subtle warm ivory cotton rag paper with barely visible natural fibres and fine pressed grain. Straight-on flat scan of paper filling entire canvas, evenly lit, restrained tactile realism, almost white cream #f4eddd. No drawing, no objects, no borders, no page edges, no shadows or gradients, no creases, no writing, no symbols, no watermark. Seamless tileable edges, uniform tone across all four corners. This is a production background behind readable HTML text and collectible cards, not a screenshot or UI mockup.
