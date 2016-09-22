import createSearchFilters from '../../links/lib/createSearchFilters';
import sift from 'sift';

export default (childCollectionNode, limit) => {
    const parent = childCollectionNode.parent;
    const linker = childCollectionNode.linker;

    const strategy = linker.strategy;
    const isVirtual = linker.isVirtual();
    const isSingle = linker.isSingle();
    const removeStorageField = !childCollectionNode.parentHasMyLinkStorageFieldSpecified();
    const oneResult = (isVirtual && linker.linkConfig.relatedLinker.linkConfig.unique) || (!isVirtual) && isSingle;

    const fieldStorage = linker.linkStorageField;

    _.each(parent.results, result => {
        const data = assembleData(childCollectionNode, result, {
            fieldStorage, strategy, isVirtual, isSingle
        });

        result[childCollectionNode.linkName] = filterAssembledData(data, {limit, oneResult})
    });

    if (removeStorageField) {
        _.each(parent.results, result => delete result[fieldStorage]);
    }
}

function filterAssembledData(data, {limit, oneResult}) {
    if (limit) {
        return data.slice(limit);
    }

    if (oneResult) {
        return _.first(data);
    }

    return data;
}

function assembleData(childCollectionNode, result, {fieldStorage, strategy, isVirtual}) {
    const filters = createSearchFilters(result, fieldStorage, strategy, isVirtual);

    return sift(filters, childCollectionNode.results);
}