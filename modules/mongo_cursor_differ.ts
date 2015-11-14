/// <reference path="../typings/angular2-meteor.d.ts" />

'use strict';

import {ChangeDetectorRef, bind} from 'angular2/angular2';
import {DefaultIterableDifferFactory, CollectionChangeRecord} from 'angular2/change_detection';
import {ObservableWrapper} from 'angular2/facade';

import {MongoCursorObserver, AddChange, MoveChange, RemoveChange} from './mongo_cursor_observer';

export interface ObserverFactory {
  create(cursor: Object): Object;
}

class MongoCursorObserverFactory implements ObserverFactory {
  create(cursor: Object): Object {
    if (cursor instanceof Mongo.Cursor) {
      return new MongoCursorObserver(cursor);
    }
    return null;
  }
}

export class MongoCursorDifferFactory extends DefaultIterableDifferFactory {
  supports(obj: Object): boolean { return obj instanceof Mongo.Cursor; }

  create(cdRef: ChangeDetectorRef): MongoCursorDiffer {
      return new MongoCursorDiffer(cdRef, new MongoCursorObserverFactory());
  }
}

export class MongoCursorDiffer {
  private _inserted: Array<CollectionChangeRecord> = [];
  private _removed: Array<CollectionChangeRecord> = [];
  private _moved: Array<CollectionChangeRecord> = [];
  private _curObserver: MongoCursorObserver;
  private _lastChanges: Array<AddChange | MoveChange | RemoveChange>;
  private _listSize: number = 0;
  private _cursor: Mongo.Cursor<any>;
  private _obsFactory: ObserverFactory;
  private _subscription: Object;

  constructor(cdRef: ChangeDetectorRef, obsFactory: ObserverFactory) {
    this._obsFactory = obsFactory;
  }

  forEachAddedItem(fn: Function) {
    for (var i = 0; i < this._inserted.length; i++) {
      fn(this._inserted[i]);
    }
  }

  forEachMovedItem(fn: Function) {
    for (var i = 0; i < this._moved.length; i++) {
      fn(this._moved[i]);
    }
  }

  forEachRemovedItem(fn: Function) {
    for (var i = 0; i < this._removed.length; i++) {
      fn(this._removed[i]);
    }
  }

  diff(cursor: Mongo.Cursor<any>) {
    this._reset();

    if (cursor && this._cursor !== cursor) {
      this._destroyObserver();
      this._cursor = cursor;
      this._curObserver = <MongoCursorObserver>this._obsFactory.create(cursor);
      this._subscription = ObservableWrapper.subscribe(this._curObserver,
        zone.bind(changes => {
          this._updateLatestValue(changes);
        }));
      this._lastChanges = this._curObserver.lastChanges;
    }

    if (this._lastChanges) {
      this._applyChanges(this._lastChanges);
      this._lastChanges = null;
      return this;
    }

    return null;
  }

  onDestroy() {
    this._destroyObserver();
  }

  get observer() {
    return this._curObserver;
  }

  _destroyObserver() {
    if (this._subscription) {
      ObservableWrapper.dispose(this._subscription);
    }
    if (this._curObserver) {
      this._curObserver.destroy();
    }

    this._applyCleanup();
  }

  _updateLatestValue(changes) {
    this._lastChanges = changes;
  }

  _reset() {
    this._inserted.length = 0;
    this._moved.length = 0;
    this._removed.length = 0;
  }

  // Reset previous state of the differ
  // by removing all currently shown documents.
  _applyCleanup() {
    for (var index = 0; index < this._listSize; index++) {
      this._removed.push(this._createChangeRecord(
        null, index, null));
    }
    this._listSize = 0;
  }

  _applyChanges(changes) {
    for (var i = 0; i < changes.length; i++) {
      if (changes[i] instanceof AddChange) {
        this._inserted.push(this._createChangeRecord(
          changes[i].index, null, changes[i].item));
        this._listSize++;
      }
      if (changes[i] instanceof MoveChange) {
        this._moved.push(this._createChangeRecord(
          changes[i].toIndex, changes[i].fromIndex, changes[i].item));
      }
      if (changes[i] instanceof RemoveChange) {
        this._removed.push(this._createChangeRecord(
          null, changes[i].index, changes[i].item));
        this._listSize--;
      }
    }
  }

  _createChangeRecord(currentIndex, prevIndex, item) {
    var record = new CollectionChangeRecord(item);
    record.currentIndex = currentIndex;
    record.previousIndex = prevIndex;
    return record;
  }
}