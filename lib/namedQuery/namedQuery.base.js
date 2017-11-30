import deepClone from 'lodash.clonedeep';

const specialParameters = ['$body'];

export default class NamedQueryBase {
    constructor(name, collection, body, options = {}) {
        this.queryName = name;

        if (_.isFunction(body)) {
            this.resolver = body;
        } else {
            this.body = deepClone(body);
        }

        this.subscriptionHandle = null;
        this.params = options.params || {};
        this.options = options;
        this.collection = collection;
        this.isExposed = false;
    }

    get name() {
        return `named_query_${this.queryName}`;
    }

    setParams(params) {
        this.params = _.extend({}, this.params, params);

        return this;
    }

    /**
     * Validates the parameters
     */
    doValidateParams(params) {
        params = params || this.params;
        params = _.omit(params, ...specialParameters);

        const {validateParams} = this.options;
        if (!validateParams) return;

        try {
            this._validate(validateParams, params);
        } catch (validationError) {
            console.error(`Invalid parameters supplied to the query "${this.queryName}"\n`, validationError);
            throw validationError; // rethrow
        }
    }

    clone(newParams) {
        const params = _.extend({}, deepClone(this.params), newParams);

        let clone = new this.constructor(
            this.queryName,
            this.collection,
            this.isResolver ? this.resolver : deepClone(this.body),
            {
                ...this.options,
                params,
            }
        );

        clone.cacher = this.cacher;
        if (this.exposeConfig) {
            clone.exposeConfig = this.exposeConfig;
        }

        return clone;
    }

    /**
     * @param {function|object} validator
     * @param {object} params
     * @private
     */
    _validate(validator, params) {
        if (_.isFunction(validator)) {
            validator.call(null, params)
        } else {
            check(params, validator)
        }
    }
}