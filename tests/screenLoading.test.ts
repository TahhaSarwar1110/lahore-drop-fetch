import { describe, expect, it } from "bun:test";
import { createScreenLoadingStore } from "../src/lib/screenLoading";

describe("screen processing state", () => {
  it("stays active until every processing action finishes", () => {
    const store = createScreenLoadingStore();
    expect(store.getSnapshot()).toBe(false);
    const finishFirst = store.start();
    const finishSecond = store.start();
    expect(store.getSnapshot()).toBe(true);
    finishFirst();
    finishFirst();
    expect(store.getSnapshot()).toBe(true);
    finishSecond();
    expect(store.getSnapshot()).toBe(false);
  });

  it("notifies subscribed screens and cleans up subscriptions", () => {
    const store = createScreenLoadingStore();
    const snapshots: boolean[] = [];
    const unsubscribe = store.subscribe(() => snapshots.push(store.getSnapshot()));
    const finish = store.start();
    finish();
    expect(snapshots).toEqual([true, false]);
    unsubscribe();
    store.start();
    expect(snapshots).toEqual([true, false]);
  });
});