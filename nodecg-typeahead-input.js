(function () {
	'use strict';

	const TARGET_WINDOW = findNodeCGWindowOrTopWindow();
	const TARGET_DOCUMENT = TARGET_WINDOW.document;
	const CURRENT_WINDOW_IS_TARGET_WINDOW = TARGET_WINDOW === window;

	function findNodeCGWindowOrTopWindow() {
		if (window.__nodecg__) {
			return window;
		}

		try {
			let parent = window.parent;
			while (parent && parent !== parent.parent) {
				if (parent.__nodecg__) {
					return parent;
				}

				parent = parent.parent;
			}

			return parent;
		} catch (e) {
			return window;
		}
	}

	// Don't use the iframe for suggestions if we're not in an iframe.
	const USE_IFRAME = !CURRENT_WINDOW_IS_TARGET_WINDOW;
	const IFRAME_ID = 'nodecg-typeahead-suggestions';
	let HEADER_HEIGHT;

	const FORWARDED_METHODS = [
		'blur',
		'cancel',
		'close',
		'focus',
		'hasValidator',
		'modelForElement',
		'open',
		'stamp',
		'templatize',
		'validate'
	];

	let pages;
	let iframe;
	if (USE_IFRAME) {
		const dashboard = TARGET_DOCUMENT.querySelector('ncg-dashboard');
		const header = dashboard ? dashboard.shadowRoot.querySelector('#header') : null;
		HEADER_HEIGHT = header ? header.getBoundingClientRect().height : 0;
		pages = dashboard.shadowRoot.getElementById('pages');

		// Build the iframe that will house the suggestions list.
		// Because we hide the suggestions list when the user clicks away, we know that just one suggestions iframe
		// can serve all the nodecg-typeahead-input elements on the page.
		iframe = TARGET_DOCUMENT.getElementById(IFRAME_ID);
		if (!iframe) {
			iframe = document.createElement('iframe');
			iframe.id = IFRAME_ID;

			// Yeah, I can't justify this. It's stupid as hell. You got me.
			iframe.src = window.location.pathname.split('/').slice(0, 3).join('/') +
				'/bower_components/nodecg-typeahead-input/suggestions_iframe.html';

			iframe.style.position = 'absolute';
			iframe.style.zIndex = 105;
			iframe.setAttribute('frameborder', '0');

			TARGET_DOCUMENT.body.appendChild(iframe);
		}

		// Don't bootstrap this element until the iframe has finished loading.
		if (iframe.contentWindow.suggestionsReady) {
			bootstrap();
		} else {
			iframe.contentWindow.addEventListener('suggestionsReady', bootstrap);
		}
	} else {
		bootstrap();
	}

	function bootstrap() {
		class NodecgTypeaheadInput extends Polymer.Element {
			static get is() {
				return 'nodecg-typeahead-input';
			}

			static get properties() {
				return {
					// Properties bound to vaadin-combo-box
					allowCustomValue: Boolean,
					allowedPattern: String,
					alwaysFloatLabel: Boolean,
					autofocus: Boolean,
					autoValidate: Boolean,
					disabled: Boolean,
					errorMessage: String,
					filter: {
						type: String,
						notify: true
					},
					filteredItems: Array,
					focused: {
						type: Boolean,
						notify: true
					},
					hasValue: {
						type: Boolean
					},
					inputElement: {
						type: HTMLElement
					},
					inputmode: String,
					invalid: {
						type: Boolean,
						notify: true
					},
					itemLabelPath: String,
					items: Array,
					itemValuePath: String,
					label: String,
					loading: Boolean,
					name: String,
					noLabelFloat: Boolean,
					opened: {
						type: Boolean,
						notify: true
					},
					pattern: String,
					placeholder: String,
					preventInvalidInput: Boolean,
					readonly: Boolean,
					required: Boolean,
					selectedItem: {
						type: Object,
						notify: true
					},
					size: Number,
					validator: String,
					validatorType: String,
					value: {
						type: String,
						notify: true
					},

					verticalOffset: {
						type: Number,
						value: 0
					},

					// Our custom properties
					replicantName: String,
					replicantBundle: String
				};
			}

			ready() {
				super.ready();

				// Forward method calls to the combobox
				FORWARDED_METHODS.forEach(methodName => {
					this[methodName] = function (...args) {
						return this.$.combobox[methodName](...args);
					};
				});

				// A performance hack. The default physical count is a whopping 500,
				// which really hurts when the overlay items are complex custom templates.
				this.$.combobox.$.overlay.$.selector.maxPhysicalCount = 40;

				if (USE_IFRAME) {
					this._bootstrapIframe();
				}
			}

			_bootstrapIframe() {
				const holder = iframe.contentWindow.document.getElementById('holder');
				const overlay = this.$.combobox.$.overlay;
				const originalOverlayMoveTo = overlay._moveTo.bind(overlay);
				let hasBeenMoved = false;
				overlay._moveTo = function () {
					if (hasBeenMoved) {
						return;
					}

					hasBeenMoved = true;
					return originalOverlayMoveTo(holder);
				};

				this.positionTarget = this.$.combobox.$.inputContainer.shadowRoot.querySelector('.underline');

				iframe.style.pointerEvents = 'none';

				// 2017-08-26: On Firefox, just setting pointerEvents to none is not enough.
				// We also have to set display: none to make the iframe not intercept clicks when we don't want it to.
				iframe.style.display = 'none';

				this.$.combobox.addEventListener('vaadin-dropdown-opened', () => {
					// Show the iframe
					iframe.style.display = 'block';
					iframe.style.pointerEvents = '';
					this._overlay.style.display = '';

					this._setPosition();
				});

				this.$.combobox.addEventListener('vaadin-dropdown-closed', () => {
					// Hide the iframe
					iframe.style.pointerEvents = 'none';
					iframe.style.display = 'none';
					this._overlay.style.display = 'none';
				});

				this._overlay = this.$.combobox.$.overlay;
			}

			_verticalOffset(overlayRect, targetRect) {
				if (this._alignedAbove) {
					const positionTargetRect = this.positionTarget.getBoundingClientRect();
					const parentRect = this.getBoundingClientRect();
					return -overlayRect.height - (positionTargetRect.top - parentRect.top);
				}

				return targetRect.height + this.verticalOffset;
			}

			_isPositionFixed(element) {
				const offsetParent = element.offsetParent;

				return window.getComputedStyle(this._unwrapIfNeeded(element)).position === 'fixed' ||
					(offsetParent && this._isPositionFixed(offsetParent));
			}

			_maxHeight(targetRect) {
				const margin = 8;
				const minHeight = 116; // Height of two items in combo-box

				let retValue;
				if (this._alignedAbove) {
					retValue = this._calcAbsBoundingRect(this).top - HEADER_HEIGHT - margin;
				} else {
					retValue = TARGET_WINDOW.innerHeight - targetRect.bottom - margin;
				}

				// Clamp minimum
				retValue = Math.max(retValue, minHeight);

				// Clamp maximum
				retValue = Math.min(retValue, TARGET_WINDOW.innerHeight * 0.65); // 65vh

				return `${retValue}px`;
			}

			_setPosition() {
				const targetRect = this._calcAbsBoundingRect(this.positionTarget);
				this._alignedAbove = this._shouldAlignAbove();

				// Overlay max height is restrained by the #scroller max height which is set to 65vh in CSS.
				iframe.height = this._maxHeight(targetRect);

				// We need to set height for iron-list to make its `firstVisibleIndex` work correctly.
				this._overlay.$.selector.style.maxHeight = this._maxHeight(targetRect);

				const iframeRect = iframe.getBoundingClientRect();
				iframe._translateX = targetRect.left - iframeRect.left + (iframe._translateX || 0);
				iframe._translateY = targetRect.top - iframeRect.top + (iframe._translateY || 0) +
					this._verticalOffset(iframeRect, targetRect);

				const _devicePixelRatio = TARGET_WINDOW.devicePixelRatio || 1;
				iframe._translateX = Math.round(iframe._translateX * _devicePixelRatio) / _devicePixelRatio;
				iframe._translateY = Math.round(iframe._translateY * _devicePixelRatio) / _devicePixelRatio;
				iframe.style.transform = `translate(${iframe._translateX}px, ${iframe._translateY}px)`;

				iframe.style.width = `${targetRect.width}px`;
			}

			_shouldAlignAbove() {
				const targetRect = this._calcAbsBoundingRect(this.positionTarget);

				// ScrollTop can only be negative in certain cases, such as mobile touch over-dragging
				const divisor = TARGET_WINDOW.innerHeight - targetRect.bottom - Math.min(pages.scrollTop, 0);
				const spaceBelow = divisor / TARGET_WINDOW.innerHeight;
				return spaceBelow < 0.30;
			}

			_calcAbsBoundingRect(target) {
				const targetRect = target.getBoundingClientRect();
				const panelRect = window.frameElement.getBoundingClientRect();
				return {
					top: panelRect.top + targetRect.top,
					bottom: panelRect.top + targetRect.bottom, // No, this isn't a typo.
					left: panelRect.left + targetRect.left,
					right: panelRect.right + targetRect.right,
					width: targetRect.width,
					height: targetRect.height
				};
			}
		}

		window.NodecgTypeaheadInput = NodecgTypeaheadInput;
		customElements.define(NodecgTypeaheadInput.is, NodecgTypeaheadInput);
		Polymer.RenderStatus.afterNextRender(this, () => {
			NodecgTypeaheadInput.bootstrapped = true;
			window.dispatchEvent(new CustomEvent('nodecg-typeahead-input-bootstrapped'));
		});
	}
})();
