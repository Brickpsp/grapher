import Link from './base.js';
import SmartArgs from './lib/smartArguments.js';

export default class LinkManyMeta extends Link {
    clean() {
        if (!this.object[this.getLinkStorageField()]) {
            this.object[this.getLinkStorageField()] = [];
        }
    }

    /**
     * @param filters
     */
    applyFindFilters(filters) {
        let field = this.getLinkStorageField();
        filters._id = {$in: _.pluck(this.object[field], '_id')};
    }

    /**
     * @param filters
     */
    applyFindFiltersForVirtual(filters) {
        filters[this.getLinkStorageField() + '._id'] = this.object._id;
    }

    /**
     * @param what
     * @param metadata
     */
    add(what, metadata = {}) {
        if (this.isVirtual) throw new Meteor.Error('not-allowed', 'Add/Remove operations should be done from the owner of the relationship');

        const _ids = this.identifyIds(what, true);

        let field = this.getLinkStorageField();

        this.object[field] = this.object[field] || [];
        let metadatas = [];

        _.each(_ids, _id => {
            let localMetadata = _.clone(metadata);
            localMetadata._id = _id;

            this.object[field].push(localMetadata);
            metadatas.push(localMetadata);
        });

        let modifier = {
            $addToSet: {
                [field]: {$each: metadatas}
            }
        };

        this.linker.mainCollection.update(this.object._id, modifier);

        return this;
    }

    /**
     * @param what
     * @param extendMetadata
     */
    metadata(what, extendMetadata) {
        if (this.isVirtual) {
            throw new Meteor.Error('not-allowed', 'Metadata operations must be done from the owner of the relationship');
        }

        let field = this.getLinkStorageField();

        if (what === undefined) {
            return this.object[field];
        }

        if (_.isArray(what)) {
            throw new Meteor.Error('not-allowed', 'Metadata updates should be made for one entity only, not multiple');
        }

        const _id = this.identifyId(what);

        let existingMetadata = _.find(this.object[field], metadata => metadata._id == _id);
        if (extendMetadata === undefined) {
            return existingMetadata;
        } else {
            _.extend(existingMetadata, extendMetadata);
            let subfield = field + '._id';
            let subfieldUpdate = field + '.$';

            this.linker.mainCollection.update({
                _id: this.object._id,
                [subfield]: _id
            }, {
               $set: {
                   [subfieldUpdate]: existingMetadata
               }
            });
        }

        return this;
    }

    remove(what) {
        const _ids = this.identifyIds(what);
        let field = this.getLinkStorageField();

        this.object[field] = _.filter(this.object[field], link => !_.contains(_ids, link._id));

        let modifier = {
            $pull: {
                [field]: {
                    $elemMatch: {
                        _id: {
                            $in: _ids
                        }
                    }
                }
            }
        };

        this.linker.mainCollection.update(this.object._id, modifier);

        return this;
    }

    set() {
        throw new Meteor.Error('invalid-command', 'You are trying to *set* in a relationship that is single. Please use add/remove for *many* relationships');
    }

    unset() {
        throw new Meteor.Error('invalid-command', 'You are trying to *unset* in a relationship that is single. Please use add/remove for *many* relationships');
    }
}