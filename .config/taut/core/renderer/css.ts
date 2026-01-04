// Taut CSS Utilities
// Provides functions to inject and remove CSS styles

const styleElementIdPrefix = 'taut-css-'

function getStyleElement(key: string): HTMLStyleElement {
  let styleElement = document.getElementById(
    styleElementIdPrefix + key
  ) as HTMLStyleElement | null
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = styleElementIdPrefix + key
    document.head.appendChild(styleElement)
  }
  return styleElement
}

export function setStyle(key: string, css: string) {
  const styleElement = getStyleElement(key)
  styleElement.textContent = css
}
export function removeStyle(key: string) {
  const styleElement = document.getElementById(
    styleElementIdPrefix + key
  ) as HTMLStyleElement | null
  if (styleElement && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement)
  }
}
