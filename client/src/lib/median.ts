import Median from "median-js-bridge";

/**
 * True when running inside the Median native iOS/Android app.
 * False in a regular browser. Safe to use anywhere.
 */
export const isMedianApp: boolean =
  typeof navigator !== "undefined" &&
  navigator.userAgent.indexOf("median") > -1;

export default Median;
