import controllerVerbNaming from "./rules/controller-verb-naming.js";
import noBareErrorThrow from "./rules/no-bare-error-throw.js";
import noConsoleLogging from "./rules/no-console-logging.js";
import noManualEnvelope from "./rules/no-manual-envelope.js";
import noManualObservability from "./rules/no-manual-observability.js";
import noNumericId from "./rules/no-numeric-id.js";
import requireApiOperation from "./rules/require-api-operation.js";
import requireApiPropertyExample from "./rules/require-api-property-example.js";
import requireApiResponse from "./rules/require-api-response.js";
import requirePermission from "./rules/require-permission.js";

export default {
  rules: {
    "controller-verb-naming": controllerVerbNaming,
    "no-bare-error-throw": noBareErrorThrow,
    "no-console-logging": noConsoleLogging,
    "no-manual-envelope": noManualEnvelope,
    "no-manual-observability": noManualObservability,
    "no-numeric-id": noNumericId,
    "require-api-operation": requireApiOperation,
    "require-api-property-example": requireApiPropertyExample,
    "require-api-response": requireApiResponse,
    "require-permission": requirePermission,
  },
};
