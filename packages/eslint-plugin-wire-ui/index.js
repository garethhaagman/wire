import noHardcodedColors from "./rules/no-hardcoded-colors.js";
import noRawQueryKeys from "./rules/no-raw-query-keys.js";
import requireStorybookStory from "./rules/require-storybook-story.js";
import useDesignSystemPrimitives from "./rules/use-design-system-primitives.js";

export default {
  rules: {
    "no-hardcoded-colors": noHardcodedColors,
    "no-raw-query-keys": noRawQueryKeys,
    "require-storybook-story": requireStorybookStory,
    "use-design-system-primitives": useDesignSystemPrimitives,
  },
};
