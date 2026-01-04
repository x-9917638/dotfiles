// Taut React Utilities
// Provides utilities for finding and patching React components
// Implements component patching via React.createElement proxy

import type { Root } from 'react-dom/client'
import { findExport, React, ReactDOM, ReactDOMClient } from './webpack'

const global = globalThis as any
const __REACT_DEVTOOLS_GLOBAL_HOOK__ = global.__REACT_DEVTOOLS_GLOBAL_HOOK__

global.React = React // Makes JSX work anywhere

type filter = (exp: any) => boolean

function componentFilter(name: string, filter?: filter) {
  const func = (exp: any) => {
    if (!exp) return false
    if (filter && !filter(exp)) return false

    if (typeof exp === 'object') {
      if (exp.$$typeof === Symbol.for('react.memo')) {
        if (exp.displayName === name) return true
        if (getComponentName(exp.type) === name) return true
      }
      if (exp.$$typeof === Symbol.for('react.forward_ref')) {
        if (exp.displayName === name) return true
        if (exp.render?.displayName === name) return true
        if (exp.render?.name === name) return true
      }
    }

    if (typeof exp === 'function') {
      if (exp.displayName === name) return true
      if (exp.name === name) return true
    }

    return false
  }

  return func
}

/**
 * Find React components by their display name
 * @param name - Display name of the component
 * @param all - Whether to return all matches or just the first (default: false)
 * @param filter - Optional additional filter function
 */

export function findComponent<P extends {}>(
  name: string,
  all?: false,
  filter?: filter
): React.ComponentType<P>
export function findComponent<P extends {}>(
  name: string,
  all: true,
  filter?: filter
): React.ComponentType<P>[]
export function findComponent(name: string, all = false, filter?: filter) {
  const func = componentFilter(name, filter)

  if (all) {
    return findExport(func, true)
  } else {
    const result = findExport(func)
    if (!result) throw new Error(`[Taut] Could not find component: ${name}`)
    return result
  }
}

export function getRootFiber() {
  const container = document.querySelector('.p-client_container')
  if (!container) throw new Error('Could not find root container')
  const key = Object.keys(container).find((k) =>
    k.startsWith('__reactContainer$')
  )
  if (!key) throw new Error('Could not find root fiber key on container')
  const rootFiber = (container as any)[key]
  return rootFiber
}
// getFiberRoot().current === getRootFiber()
export function getFiberRoot() {
  return [...__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots(1)][0]
}

const tempRoot = ReactDOMClient.createRoot(document.createElement('div'))
tempRoot.unmount()
const ReactDOMRoot = tempRoot.constructor as new (fiberRoot: any) => Root
export function getRoot() {
  const fiberRoot = getFiberRoot()
  return new ReactDOMRoot(fiberRoot)
}

export function dirtyMemoizationCache() {
  const rootFiber = getRootFiber()

  const poison = (node: any) => {
    if (!node) return
    if (node.memoizedProps && typeof node.memoizedProps === 'object') {
      node.memoizedProps = { ...node.memoizedProps, _poison: 1 }
    }
    poison(node.child)
    poison(node.sibling)
  }
  poison(rootFiber)
}

export type ComponentType<P = any> = React.ComponentType<P> | string

/**
 * Get the name of a React component (not string)
 * Works on any type, won't misfire on non-components
 * Use this for any logic that depends on the component name
 */
function getComponentName(component: any): string | null {
  if (!component) return null

  if (typeof component === 'object') {
    if (component.$$typeof === Symbol.for('react.memo')) {
      return getComponentName(component.type)
    }
    if (component.$$typeof === Symbol.for('react.forward_ref')) {
      return (
        component.displayName ||
        component.render?.displayName ||
        component.render?.name ||
        null
      )
    }
    if (component.$$typeof === Symbol.for('taut.originalComponent')) {
      return component.displayName || null
    }
  }

  if (typeof component === 'function') {
    return component.displayName || null
  }

  return null
}
/**
 * Get the display name of a React component (including string components)
 * Will always return something, even if it's just "Component"
 * Use this for anything displaying component names
 */
function getDisplayName(component: ComponentType): string {
  if (typeof component === 'string') return component
  const name = getComponentName(component)
  if (name) return name
  return 'Component'
}

type componentMatcher = (component: ComponentType) => boolean
export type componentReplacer<P = any> = (
  OriginalComponent: ComponentType<P>
) => ComponentType<P>

const componentReplacements = new Map<componentMatcher, componentReplacer>()
const originalComponentSymbol = Symbol.for('taut.originalComponent')

const originalComponentObjectCache = new WeakMap<any, originalComponentObject>()
type originalComponentObject = {
  $$typeof: typeof originalComponentSymbol
  originalComponent: ComponentType
  displayName: string
}
function getOriginalComponentObject(
  component: ComponentType
): originalComponentObject {
  if (originalComponentObjectCache.has(component)) {
    return originalComponentObjectCache.get(
      component
    ) as originalComponentObject
  }
  const obj: originalComponentObject = {
    $$typeof: originalComponentSymbol,
    originalComponent: component,
    displayName: getDisplayName(component),
  }
  originalComponentObjectCache.set(component, obj)
  return obj
}
function isOriginalComponentObject(
  component: any
): component is originalComponentObject {
  return (
    typeof component === 'object' &&
    component !== null &&
    component.$$typeof === originalComponentSymbol &&
    'originalComponent' in component
  )
}

const replacerResultCache = new WeakMap<
  componentReplacer,
  Map<ComponentType, ComponentType>
>()

/**
 * Applies a replacer function to a component, caching the result.
 * If the result is a function component without a display name, it assigns one.
 */
function applyReplacerWithCache<P = any>(
  replacer: componentReplacer<P>,
  originalComponent: ComponentType<P>
): ComponentType<P> {
  let resultCache = replacerResultCache.get(replacer)
  if (!resultCache) {
    resultCache = new Map<ComponentType, ComponentType>()
    replacerResultCache.set(replacer, resultCache)
  }
  if (resultCache.has(originalComponent)) {
    return resultCache.get(originalComponent) as ComponentType<P>
  }

  const replaced = replacer(originalComponent)
  if (typeof replaced === 'function' && !('displayName' in replaced)) {
    // Shows up as the original element name with a [Patched] tag in React DevTools
    replaced.displayName = `Patched(${getDisplayName(originalComponent)})`
  }

  resultCache.set(originalComponent, replaced)
  return replaced
}

/**
 * Proxy React.createElement to intercept component creation and apply patches.
 * This allows us to replace components at runtime without modifying the original source.
 */
React.createElement = new Proxy(React.createElement, {
  apply(
    target: typeof React.createElement,
    thisArg: any,
    [component, props, ...children]: [
      component: ComponentType | originalComponentObject,
      props: any,
      ...children: any[],
    ]
  ) {
    const __original = props && props['__original']
    if (__original) {
      delete props['__original']
    }

    // This is a special object that is equivalent to the original type without replacement
    if (isOriginalComponentObject(component)) {
      const originalComponent = component['originalComponent']
      return Reflect.apply(target, thisArg, [
        originalComponent,
        props,
        ...children,
      ])
    }

    if (!__original) {
      const componentReplacers = [
        ...componentReplacements
          .entries()
          .filter(([matcher, _]) => {
            return matcher(component)
          })
          .map(([_, replacer]) => replacer),
      ]
      if (componentReplacers && componentReplacers.length > 0) {
        // Can be used in place of the original type, but will not get replaced again
        const originalComponent = getOriginalComponentObject(
          component
        ) as unknown as ComponentType

        const replacedComponent = componentReplacers.reduce(
          (currentComponent, replacer) =>
            applyReplacerWithCache(replacer, currentComponent),
          originalComponent
        )
        return Reflect.apply(target, thisArg, [
          replacedComponent,
          props,
          ...children,
        ])
      }
    }

    return Reflect.apply(target, thisArg, [component, props, ...children])
  },
})
declare global {
  namespace React {
    interface Attributes {
      /**
       * [Taut] Marks this element to use the original component, bypassing any patches.
       */
      __original?: true
    }
  }
}

/**
 * Patch a React component to replace it with a custom implementation
 * @param original - Original component to patch
 * @param replacement - Function that takes the original component and returns the patched component
 * @returns Unpatch function to restore the original component
 */
export function patchComponent<P = {}>(
  matcher:
    | string
    | { displayName?: string; filter?: filter; component?: ComponentType<P> },
  replacement: componentReplacer<P>
): () => void {
  const displayName =
    typeof matcher === 'string' ? matcher : matcher.displayName
  const filter = typeof matcher === 'string' ? undefined : matcher.filter
  const component = typeof matcher === 'string' ? undefined : matcher.component

  const matcherFunc: componentMatcher = (comp: any) => {
    if (component && comp === component) {
      return true
    }
    const name = getComponentName(comp)
    if (name !== displayName) {
      return false
    }
    if (filter && !filter(comp)) {
      return false
    }
    return true
  }

  componentReplacements.set(matcherFunc, replacement)

  dirtyMemoizationCache()
  console.log(`[Taut] patchComponent: Patched component`, componentReplacements)
  return () => {
    componentReplacements.delete(matcherFunc)
    dirtyMemoizationCache()
    console.log(`[Taut] patchComponent: Unpatched component`)
  }
}

// Expose for debugging in console
global.findComponent = findComponent
global.patchComponent = patchComponent
global.ReactDOM = ReactDOM
global.ReactDOMClient = ReactDOMClient
