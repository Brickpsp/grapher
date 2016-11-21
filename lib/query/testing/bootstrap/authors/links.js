import Authors from './collection.js';
import Posts from '../posts/collection.js';
import Comments from '../comments/collection.js';
import Groups from '../groups/collection.js';

Authors.addLinks({
    comments: {
        collection: Comments,
        inversedBy: 'author'
    },
    posts: {
        collection: Posts,
        inversedBy: 'author'
    },
    groups: {
        type: 'many',
        metadata: {},
        collection: Groups,
        field: 'groupIds'
    }
});

Authors.addReducers({
    fullName: {
        body: {
            name: 1
        },
        reduce(object) {
            return 'full - ' + object.name;
        }
    },
    groupNames: {
        body: {
            groups: {
                name: 1
            }
        },
        reduce(object) {
            if (object.groups) {
                return object.groups.map(group => 'G#' + group.name);
            }
        }
    }
});