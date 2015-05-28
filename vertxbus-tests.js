Tinytest.add('Event Bus Test', function (test) {
    EventBus = new Vertx.EventBus("http://localhost:8080/eventbus");
    test.isNotUndefined(EventBus);
    test.instanceOf(EventBus, Vertx.EventBus);
    test.equal(EventBus.readyState(), Vertx.EventBus.CONNECTING, "Expected values to be equal");
});