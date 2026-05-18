/**
 * Same-name entry of the `lib` folder — makes `src/App/lib` a component folder so
 * buildGraph emits its folder node. `lib` is also a role segment, so the folder is
 * a role folder; with no `index.ts` it is the one deliberate barrel-required-for-role
 * violation in this fixture.
 */
export const lib = 1;
