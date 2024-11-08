"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWeatherApi = void 0;
const fetch = require("node-fetch");
const flatbuffers_1 = require("flatbuffers");
const weather_api_response_1 = require("@openmeteo/sdk/weather-api-response");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function fetchRetried(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, retries = 3, backoffFactor = 0.5, backoffMax = 2) {
        const statusToRetry = [500, 502, 504];
        const statusWithJsonError = [400, 429];
        let currentTry = 0;
        let response = yield fetch(url);
        while (statusToRetry.includes(response.status)) {
            currentTry++;
            if (currentTry >= retries) {
                throw new Error(response.statusText);
            }
            const sleepMs = Math.min(backoffFactor * Math.pow(2, currentTry), backoffMax) * 1000;
            yield sleep(sleepMs);
            response = yield fetch(url);
        }
        if (statusWithJsonError.includes(response.status)) {
            const json = yield response.json();
            if ('reason' in json) {
                throw new Error(json.reason);
            }
            throw new Error(response.statusText);
        }
        return response;
    });
}
/**
 * Retrieve data from the Open-Meteo weather API
 *
 * @param {string} url Server and endpoint. E.g. "https://api.open-meteo.com/v1/forecast"
 * @param {any} params URL parameter as an object
 * @param {number} [retries=3] Number of retries in case of an server error
 * @param {number} [backoffFactor=0.2] Exponential backoff factor to increase wait time after each retry
 * @param {number} [backoffMax=2] Maximum wait time between retries
 * @returns {Promise<WeatherApiResponse[]>}
 */
function fetchWeatherApi(url_1, params_1) {
    return __awaiter(this, arguments, void 0, function* (url, params, retries = 3, backoffFactor = 0.2, backoffMax = 2) {
        const urlParams = new URLSearchParams(params);
        urlParams.set('format', 'flatbuffers');
        const response = yield fetchRetried(`${url}?${urlParams.toString()}`, retries, backoffFactor, backoffMax);
        const fb = new flatbuffers_1.ByteBuffer(new Uint8Array(yield response.arrayBuffer()));
        const results = [];
        let pos = 0;
        while (pos < fb.capacity()) {
            fb.setPosition(pos);
            const len = fb.readInt32(fb.position());
            results.push(weather_api_response_1.WeatherApiResponse.getSizePrefixedRootAsWeatherApiResponse(fb));
            pos += len + 4;
        }
        return results;
    });
}
exports.fetchWeatherApi = fetchWeatherApi;
