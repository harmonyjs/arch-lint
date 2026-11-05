# single-entity-per-file

**Pack:** perfile · **Engine:** syntactic · **Default severity:** error

A file exports at most one entity, meaning a class or a component. This is a
direct consequence of the "one entity, one file" model (§4). Utilities, types
and constants are not entities.

## Options

None.

## Good

```ts
export function Button() {
  return null;
}
export const buttonClass = 'btn'; // not an entity: allowed
```

## Bad

```ts
export class Store {}
export const Panel = () => null; // second entity
```

## Edge cases

- Non-exported classes and components are not counted.
- An "entity" is an exported `class`, or an exported function declaration or
  arrow/function-expression `const` whose name starts with an uppercase letter.
