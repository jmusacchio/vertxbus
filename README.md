# Integrate Meteor Apps with Vert.x via its Event Bus

[Vert.x](http://vertx.io/ "Vert.x") is a lightweight, high performance application platform for the JVM that's designed for modern mobile, web, and enterprise applications.
The [Distributed Event Bus](http://vertx.io/core_manual_java.html#event-bus "Event Bus") is the nervous system of Vert.x and connects your server-side components. Write your components in whatever language you want, and put them where you want on your network. It even penetrates into JavaScript running in the browser!
With this package you can connect your meteor apps with vert.x components and get the best of both worlds, you can even use it in client and/or server side.

## Installation

```
meteor add jmusacchio:vertxbus
```

## Connecting to the Event Bus

After installing the package you will be able to connect to Vert.x components via the event bus. The following snippet code shows you how to instance it, besides that it could be placed on any js file, even inside lib folder so it can be executed in both sides (client/server).

~~~js
EventBus = new Vertx.EventBus("http://localhost:8080/eventbus");
~~~

Now you can start interacting with the event bus, let's register a handler to start receiving messages.

~~~js
EventBus.onopen = function() {
    EventBus.registerHandler("vertx-news-feed", function(error, msg) {
        if(error === null) console.log(msg.body);
    })
}
~~~

We subscribed to an address called `vertx-news-feed` so any time a component, that is wired to the event bus, publish a message we will able to receive it. Remember that if we defined it inside the lib folder, we will get the message twice, once in the client and once in the server.

To send a message you can call send method.

~~~js
EventBus.send('meteor-news-feed', message, function(error, reply) {
    if(error === null) console.log(reply.body);
});
~~~

Where message can be a json, string ,etc. We are sending a message in a different address called `meteor-news-feed`. The reply callback is optional.

You can even delegate all the business logic to Vert.x components, so they are in charge of insert/update/delete of Mongo documents plus any other expensive computational operations and keep the amazing advantage that Meteor provides for reacting to underlying Mongo Collection changes.

> For more information regarding to event bus API [click here](http://vertx.io/core_manual_js.html#the-event-bus)

The following code snippet is an example of a Vert.x verticle that instance an http server and expands the Event Bus to the web server.
What it does is grab a messages from incoming `meteor-news-feed` and stores them into meteor mongo db instance, replying with the inserted document id.

~~~java
package io.vertx.example.apex.realtime;

import io.vertx.core.json.JsonObject;
import io.vertx.example.util.Runner;
import io.vertx.ext.apex.handler.sockjs.BridgeOptions;
import io.vertx.ext.apex.handler.sockjs.PermittedOptions;
import io.vertx.rxjava.core.AbstractVerticle;
import io.vertx.rxjava.core.eventbus.Message;
import io.vertx.rxjava.ext.apex.Router;
import io.vertx.rxjava.ext.apex.handler.StaticHandler;
import io.vertx.rxjava.ext.apex.handler.sockjs.SockJSHandler;
import io.vertx.rxjava.ext.mongo.MongoClient;

public class Server extends AbstractVerticle {

  // Convenience method so you can run it in your IDE
  public static void main(String[] args) {
    Runner.runExample(Server.class);
  }

  @Override
  public void start() throws Exception {
    Router router = Router.router(vertx);

    // Allow outbound traffic to the news-feed address
    BridgeOptions options = new BridgeOptions().addOutboundPermitted(new PermittedOptions().setAddress("vertx-news-feed"))
            .addInboundPermitted(new PermittedOptions().setAddress("meteor-news-feed"));

    router.route("/eventbus/*").handler(SockJSHandler.create(vertx).bridge(options));

    vertx.createHttpServer().requestHandler(router::accept).listen(8080);

    JsonObject config = new JsonObject()
            .put("connection_string", "mongodb://127.0.0.1:3001")
            .put("db_name", "meteor");

    MongoClient mongo = MongoClient.createShared(vertx, config);

    vertx.eventBus().consumer("meteor-news-feed", (Message<JsonObject> message) ->
            {
              System.out.println("Received news from meteor: " + message.body());
              mongo.insertObservable("posts", message.body()).subscribe(
                      id -> {
                          System.out.println("Inserted document " + id);
                          message.reply(id);
                      }, error -> {
                          System.out.println("Err");
                          error.printStackTrace();
                      }
              );
            }
    );
  }
}
~~~