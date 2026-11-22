import controllerVerbNaming from "./rules/controller-verb-naming.js";
import noBareErrorThrow from "./rules/no-bare-error-throw.js";
import noManualEnvelope from "./rules/no-manual-envelope.js";
import noNumericId from "./rules/no-numeric-id.js";
import requireApiResponse from "./rules/require-api-response.js";
import requirePermission from "./rules/require-permission.js";

export default {
  rules: {
    "controller-verb-naming": controllerVerbNaming,
    "no-bare-error-throw": noBareErrorThrow,
    "no-manual-envelope": noManualEnvelope,
    "no-numeric-id": noNumericId,
    "require-api-response": requireApiResponse,
    "require-permission": requirePermission,
  },
};
