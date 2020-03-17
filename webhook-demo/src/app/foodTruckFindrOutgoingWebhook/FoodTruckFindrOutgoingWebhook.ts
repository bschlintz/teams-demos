import * as builder from "botbuilder";
import * as express from "express";
import * as crypto from "crypto";
import { OutgoingWebhookDeclaration, IOutgoingWebhook } from "express-msteams-host";
import { find } from "lodash";
import foodtrucks from "./foodtrucks";
/**
 * Implementation for Food Truck Findr Outgoing Webhook
 */
@OutgoingWebhookDeclaration("/api/webhook")
export class FoodTruckFindrOutgoingWebhook implements IOutgoingWebhook {

    /**
     * The constructor
     */
    public constructor() {
    }

    /**
     * Implement your outgoing webhook logic here
     * @param req the Request
     * @param res the Response
     * @param next
     */
    public requestHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
        // parse the incoming message
        const incoming = req.body as builder.Activity;

        // create the response, any Teams compatible responses can be used
        let message: Partial<builder.Activity> = {
            type: builder.ActivityTypes.Message
        };

        const securityToken = process.env.SECURITY_TOKEN;
        if (securityToken && securityToken.length > 0) {
            // There is a configured security token
            const auth = req.headers.authorization;
            const msgBuf = Buffer.from((req as any).rawBody, "utf8");
            const msgHash = "HMAC " + crypto.
                createHmac("sha256", new Buffer(securityToken as string, "base64")).
                update(msgBuf).
                digest("base64");

            if (msgHash === auth) {
                // Message was ok and verified
                const scrubbedText = FoodTruckFindrOutgoingWebhook.scrubMessage(incoming.text)
                message = FoodTruckFindrOutgoingWebhook.processAuthenticatedRequest(scrubbedText);
            } else {
                // Message could not be verified
                message.text = `Error: message sender cannot be verified`;
            }
        } else {
            // There is no configured security token
            message.text = `Error: outgoing webhook is not configured with a security token`;
        }

        // send the message
        res.send(JSON.stringify(message));
    }

    private static processAuthenticatedRequest(incomingText: string): Partial<builder.Activity> {
        const message: Partial<builder.Activity> = {
            type: builder.ActivityTypes.Message
        };

        // get the selected planet
        const selectedFoodTruck = foodtrucks.find((ft) => ft.name.trim().toLowerCase().indexOf(incomingText.trim().toLowerCase()) > -1 || ft.city.trim().toLowerCase().indexOf(incomingText.trim().toLowerCase()) > -1);

        if (!selectedFoodTruck) {
            message.text = `Echo ${incomingText}`;
        } else {
            message.type = "result";
            message.attachmentLayout = "list";
            message.attachments = [this.getFoodTruckDetailCard(selectedFoodTruck)];
        }

        return message;
    }

    private static scrubMessage(incomingText: string): string {
        let cleanMessage = incomingText
            .slice(incomingText.lastIndexOf(">") + 1, incomingText.length)
            .replace("&nbsp;", "");
        return cleanMessage;
    }

    //
    // Utility to convert a food truck object to a hydrated Adaptive Card
    //
    public static getFoodTruckDetailCard(foodtruck: any): builder.Attachment {
        // load display card
        const adaptiveCardSource: any = require("./foodTruckDisplayCard.json");

        // update food truck fields in display card
        adaptiveCardSource.actions[0].url = `https://www.yelp.com/search?find_desc=${foodtruck.name}&find_loc=${foodtruck.city}`;
        find(adaptiveCardSource.body, { "id": "cardHeader" }).items[0].text = `${foodtruck.name} - ${foodtruck.city}`;

        const cardBody: any = find(adaptiveCardSource.body, { "id": "cardBody" });
        const cardDetails: any = find(cardBody.items, { "id": "foodTruckDetails" });
        find(cardDetails.columns[0].items[0].facts, { "id": "likes" }).value = foodtruck.likes;
        find(cardDetails.columns[0].items[0].facts, { "id": "sweet" }).value = foodtruck.sweet ? 'Yes' : 'No';
        find(cardDetails.columns[0].items[0].facts, { "id": "savory" }).value = foodtruck.savory ? 'Yes' : 'No';
        find(cardDetails.columns[0].items[0].facts, { "id": "vegetarian" }).value = foodtruck.vegetarian ? 'Yes' : 'No';

        // return the adaptive card
        return builder.CardFactory.adaptiveCard(adaptiveCardSource);
    }
}
