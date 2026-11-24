import controllerVerbNaming from "./rules/controller-verb-naming.js";
import noBareErrorThrow from "./rules/no-bare-error-throw.js";
import noEmDashInApiDescription from "./rules/no-em-dash-in-api-description.js";
import noManualEnvelope from "./rules/no-manual-envelope.js";
import noNumericId from "./rules/no-numeric-id.js";
import requireApiPropertyExample from "./rules/require-api-property-example.js";
import requireApiResponse from "./rules/require-api-response.js";
import requirePermission from "./rules/require-permission.js";

export default {
  rules: {
    "controller-verb-naming": controllerVerbNaming,
    "no-bare-error-throw": noBareErrorThrow,
    "no-em-dash-in-api-description": noEmDashInApiDescription,
    "no-manual-envelope": noManualEnvelope,
    "no-numeric-id": noNumericId,
    "require-api-property-example": requireApiPropertyExample,
    "require-api-response": requireApiResponse,
    "require-permission": requirePermission,
  },
};
