# nodecg-typeahead-input [![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/NodeCGElemements/nodecg-typeahead-input) [![Build Status](https://travis-ci.org/NodeCGElements/nodecg-typeahead-input.svg?branch=master)](https://travis-ci.org/NodeCGElements/nodecg-typeahead-input) [![Coverage Status](https://coveralls.io/repos/github/NodeCGElements/nodecg-typeahead-input/badge.svg?branch=master)](https://coveralls.io/github/NodeCGElements/nodecg-typeahead-input?branch=master) ![Polymer 2 only](https://img.shields.io/badge/Polymer%202-only-blue.svg)

An implementation of [vaadin-combo-box](https://www.webcomponents.org/element/vaadin/vaadin-combo-box) designed to work well in NodeCG dashboard panels. Requires Polymer 2.

## Motivation
NodeCG dashboard panels are iframes. Iframes cannot render any overflow content -- it must be clipped to the bounds of the iframe. This makes UI elements such as typeaheads with dropdowns very difficult.

`nodecg-typeahead-input` works around this limitation by placing the dropdown into its own separate iframe that gets attached to the dashboard. This separate iframe is moved around the page such that it looks and acts very simiar to a standard `vaadin-combo-box`.

In addition, `nodecg-typeahead-input` can take a `replicant-name` attribute and automatically populate its dropdown with the items in that Replicant.

## Installation

From your bundle's root directory:
```sh
bower install --save NodeCGElements/nodecg-typeahead-input
```

## Usage
```html
<nodecg-typeahead-input replicant-name="myArrayReplicant"></nodecg-typeahead-input>
```

For more detailed documentation, refer to [vaadin-combo-box](https://www.webcomponents.org/element/vaadin/vaadin-combo-box).

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## Credits

Based entirely on [vaadin-combo-box](https://www.webcomponents.org/element/vaadin/vaadin-combo-box) by the Vaadin team.

# License

nodecg-typeahead-input is provided under the MIT license, which is available to read in the 
[LICENSE](LICENSE) file.
