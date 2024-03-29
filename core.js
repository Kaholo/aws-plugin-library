const _ = require("lodash");
const kaholoPluginLibrary = require("@kaholo/plugin-library");

const helpers = require("./helpers");
const consts = require("./consts.json");

function bootstrap(
  awsService,
  pluginMethods,
  autocompleteFuncs = {},
  credentialLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const preparedPluginMethods = _.mapValues(pluginMethods, (actionMethod) => (
    async (params, ...args) => {
      const region = helpers.readRegion(params, credentialLabels.REGION, false);
      const awsServiceClient = getServiceInstance(
        awsService,
        params,
        credentialLabels,
      );

      const result = await actionMethod.apply(null, [awsServiceClient, params, region, ...args]);
      return helpers.stripAwsResultOffMetadata(result);
    }
  ));

  const preparedAutocompleteFunctions = _.mapValues(autocompleteFuncs, (autocompleteFunction) => (
    (query, params, ...args) => {
      const region = helpers.readRegion(params, credentialLabels.REGION, false);
      const awsServiceClient = getServiceInstance(
        awsService,
        params,
        credentialLabels,
      );

      return autocompleteFunction.apply(null, [query, params, awsServiceClient, region, ...args]);
    }
  ));

  return kaholoPluginLibrary.bootstrap(
    preparedPluginMethods,
    preparedAutocompleteFunctions,
  );
}

function generateAwsMethod(Command, payloadFunction = null) {
  return async (awsServiceClient, params, region) => {
    const payload = helpers.removeUndefinedAndEmpty(
      payloadFunction
        ? payloadFunction(params, region)
        : params,
    );

    const commandInstance = new Command(payload);
    return awsServiceClient.send(commandInstance);
  };
}

function getServiceInstance(
  AWSService,
  actionParams,
  credentialsLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const credentials = helpers.readCredentials(actionParams, credentialsLabels);
  return new AWSService(credentials);
}

module.exports = {
  generateAwsMethod,
  bootstrap,
};
