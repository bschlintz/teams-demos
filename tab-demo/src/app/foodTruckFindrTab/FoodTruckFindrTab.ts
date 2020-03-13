import { PreventIframe } from "express-msteams-host";

/**
 * Used as place holder for the decorators
 */
@PreventIframe("/foodTruckFindrTab/index.html")
@PreventIframe("/foodTruckFindrTab/config.html")
@PreventIframe("/foodTruckFindrTab/remove.html")
export class FoodTruckFindrTab {
}
