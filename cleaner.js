import _ from 'lodash';
import { Meteor } from 'meteor/meteor';

if (Meteor.isServer) {
  const _resetDatabase = async function(options) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error(
        'resetDatabase is not allowed outside of a development mode. ' +
        'Aborting.'
      );
    }

    options = options || {};
    let excludedCollections = ['system.indexes'];
    if (options.excludedCollections) {
      excludedCollections = excludedCollections.concat(options.excludedCollections);
    }

    const db = options.db || MongoInternals.defaultRemoteCollectionDriver().mongo.db;
    const collections = await db.collections();
    const appCollections = _.reject(collections, function(col) {
      return col.collectionName.indexOf('velocity') === 0 ||
        excludedCollections.indexOf(col.collectionName) !== -1;
    });

    const promiseArray = [];
    _.each(appCollections, function(appCollection) {
      promiseArray.push(appCollection.bulkWrite([{ deleteMany: { filter: {} } }]));
    });
    return await Promise.all(promiseArray);
  };

  Meteor.methods({
    async 'xolvio:cleaner/resetDatabase'(options) {
      await _resetDatabase(options);
    },
  });

  resetDatabase = async function(options, callback) {
    await _resetDatabase(options);
    if (typeof callback === 'function') {
      callback();
    }
  };
}
if (Meteor.isClient) {
  resetDatabase = async function(options, callback) {
    await Meteor.callAsync('xolvio:cleaner/resetDatabase', options)
        .then(callback)
        .catch(callback);
  };
}
