/*
 * Copyright 2014 Red Hat, Inc.
 *
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  and Apache License v2.0 which accompanies this distribution.
 *
 *  The Eclipse Public License is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  The Apache License v2.0 is available at
 *  http://www.opensource.org/licenses/apache2.0.php
 *
 *  You may elect to redistribute this code under either of these licenses.
 */

/*
 *   Copyright (c) 2011-2013 The original author or authors
 *   ------------------------------------------------------
 *   All rights reserved. This program and the accompanying materials
 *   are made available under the terms of the Eclipse Public License v1.0
 *   and Apache License v2.0 which accompanies this distribution.
 *
 *       The Eclipse Public License is available at
 *       http://www.eclipse.org/legal/epl-v10.html
 *
 *       The Apache License v2.0 is available at
 *       http://www.opensource.org/licenses/apache2.0.php
 *
 *   You may elect to redistribute this code under either of these licenses.
 */
(function () {
    // global on the server, window in the browser
    var root = this;

    var _vertx = (function() {
        var vertx = {};
        vertx.EventBus = function(url, options) {

            var that = this;
            var sockJSConn = new SockJS(url, undefined, options);
            var handlerMap = {};
            var replyHandlers = {};
            var state = vertx.EventBus.CONNECTING;
            var pingTimerID = null;
            var pingInterval = null;
            if (options) {
                pingInterval = options['vertxbus_ping_interval'];
            }
            if (!pingInterval) {
                pingInterval = 5000;
            }

            that.onopen = null;
            that.onclose = null;

            that.send = function(address, message, replyHandler) {
                sendOrPub("send", address, message, replyHandler)
            }

            that.publish = function(address, message) {
                sendOrPub("publish", address, message, null)
            }

            that.registerHandler = function(address, handler) {
                checkSpecified("address", 'string', address);
                checkSpecified("handler", 'function', handler);
                checkOpen();
                var handlers = handlerMap[address];
                if (!handlers) {
                    handlers = [handler];
                    handlerMap[address] = handlers;
                    // First handler for this address so we should register the connection
                    var msg = { type : "register",
                        address: address };
                    sockJSConn.send(JSON.stringify(msg));
                } else {
                    handlers[handlers.length] = handler;
                }
            }

            that.unregisterHandler = function(address, handler) {
                checkSpecified("address", 'string', address);
                checkSpecified("handler", 'function', handler);
                checkOpen();
                var handlers = handlerMap[address];
                if (handlers) {
                    var idx = handlers.indexOf(handler);
                    if (idx != -1) handlers.splice(idx, 1);
                    if (handlers.length == 0) {
                        // No more local handlers so we should unregister the connection

                        var msg = { type : "unregister",
                            address: address};
                        sockJSConn.send(JSON.stringify(msg));
                        delete handlerMap[address];
                    }
                }
            }

            that.close = function() {
                checkOpen();
                state = vertx.EventBus.CLOSING;
                sockJSConn.close();
            }

            that.readyState = function() {
                return state;
            }

            sockJSConn.onopen = function() {
                // Send the first ping then send a ping every pingInterval milliseconds
                sendPing();
                pingTimerID = setInterval(sendPing, pingInterval);
                state = vertx.EventBus.OPEN;
                if (that.onopen) {
                    that.onopen();
                }
            };

            sockJSConn.onclose = function() {
                state = vertx.EventBus.CLOSED;
                if (pingTimerID) clearInterval(pingTimerID);
                if (that.onclose) {
                    that.onclose();
                }
            };

            sockJSConn.onmessage = function(e) {
                var msg = e.data;
                var json = JSON.parse(msg);
                var type = json.type;
                if (type === 'err') {
                    console.error("Error received on connection: " + json.body);
                    return;
                }
                var body = json.body;
                var replyAddress = json.replyAddress;
                var address = json.address;
                var replyHandler;
                if (replyAddress) {
                    replyHandler = function(reply, replyHandler) {
                        // Send back reply
                        that.send(replyAddress, reply, replyHandler);
                    };
                }
                var handlers = handlerMap[address];
                if (handlers) {
                    // We make a copy since the handler might get unregistered from within the
                    // handler itself, which would screw up our iteration
                    var copy = handlers.slice(0);
                    for (var i  = 0; i < copy.length; i++) {
                        copy[i](body, replyHandler);
                    }
                } else {
                    // Might be a reply message
                    var handler = replyHandlers[address];
                    if (handler) {
                        delete replyHandlers[address];
                        handler(body, replyHandler);
                    }
                }
            }

            function sendPing() {
                var msg = {
                    type: "ping"
                }
                sockJSConn.send(JSON.stringify(msg));
            }

            function sendOrPub(sendOrPub, address, message, replyHandler) {
                checkSpecified("address", 'string', address);
                checkSpecified("replyHandler", 'function', replyHandler, true);
                checkOpen();
                var envelope = { type : sendOrPub,
                    address: address,
                    body: message };
                if (replyHandler) {
                    var replyAddress = makeUUID();
                    envelope.replyAddress = replyAddress;
                    replyHandlers[replyAddress] = replyHandler;
                }
                var str = JSON.stringify(envelope);
                sockJSConn.send(str);
            }

            function checkOpen() {
                if (state != vertx.EventBus.OPEN) {
                    throw new Error('INVALID_STATE_ERR');
                }
            }

            function checkSpecified(paramName, paramType, param, optional) {
                if (!optional && !param) {
                    throw new Error("Parameter " + paramName + " must be specified");
                }
                if (param && typeof param != paramType) {
                    throw new Error("Parameter " + paramName + " must be of type " + paramType);
                }
            }

            function isFunction(obj) {
                return !!(obj && obj.constructor && obj.call && obj.apply);
            }

            function makeUUID(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                .replace(/[xy]/g,function(a,b){return b=Math.random()*16,(a=="y"?b&3|8:b|0).toString(16)})}

        }

        vertx.EventBus.CONNECTING = 0;
        vertx.EventBus.OPEN = 1;
        vertx.EventBus.CLOSING = 2;
        vertx.EventBus.CLOSED = 3;

        return vertx;
    }());
    // Meteor
    if (typeof Package !== 'undefined') {
        Vertx = _vertx;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return _vertx;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = _vertx;
    }
    // included directly via <script> tag
    else {
        root.Vertx = _vertx;
    }
}());