import {
  TeamsActivityHandler,
  TurnContext,
  CardFactory, MessagingExtensionAction, MessagingExtensionActionResponse, MessagingExtensionAttachment,
  MessagingExtensionQuery, MessagingExtensionResponse,
  AppBasedLinkQuery
} from "botbuilder";

import foodtrucks from './foodtrucks';
import { find } from "lodash";

export class FoodTruckBot extends TeamsActivityHandler {
  constructor() {
    super();
  }

  //
  // Food Truck Selector
  //
  protected handleTeamsMessagingExtensionFetchTask(context: TurnContext, action: MessagingExtensionAction): Promise<MessagingExtensionActionResponse> {
    // load card template
    const adaptiveCardSource: any = require("./foodTruckSelectorCard.json");
    // locate the food truck selector
    let foodTruckChoiceSet: any = find(adaptiveCardSource.body, { "id": "foodTruckSelector" });
    // update choice set with food trucks
    foodTruckChoiceSet.choices = foodtrucks.map((ft) => {
      return { "value": ft.id, "title": `${ft.name} - ${ft.city}` }
    });
    // load the adaptive card
    const adaptiveCard = CardFactory.adaptiveCard(adaptiveCardSource);
  
    let response: MessagingExtensionActionResponse = <MessagingExtensionActionResponse>{
      task: {
        type: "continue",
        value: {
          card: adaptiveCard,
          title: 'Food Truck Selector',
          height: 150,
          width: 500
        }
      }
    };
  
    return Promise.resolve(response);
  }

  //
  // Insert Selected Food Truck Adaptive Card
  //
  protected handleTeamsMessagingExtensionSubmitAction(context: TurnContext, action: MessagingExtensionAction): Promise<MessagingExtensionActionResponse> {
    switch (action.commandId) {
      case 'foodTruckExpanderAction':
        // get the selected planet
        console.log('action', action)
        const selectedFoodTruck: any = foodtrucks.find((ft) => `${ft.id}` === action.data.foodTruckSelector);
        const adaptiveCard = this.getFoodTruckDetailCard(selectedFoodTruck);
  
        // generate the response
        return Promise.resolve(<MessagingExtensionActionResponse>{
          composeExtension: {
            type: "result",
            attachmentLayout: "list",
            attachments: [adaptiveCard]
          }
        });
        break;
      default:
        throw new Error('NotImplemented');
    }
  }

  //
  // Utility to convert a food truck object to a hydrated Adaptive Card
  //
  private getFoodTruckDetailCard(foodtruck: any): MessagingExtensionAttachment {
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
    return CardFactory.adaptiveCard(adaptiveCardSource);
  }

  //
  // Search for Food Trucks
  //
  protected handleTeamsMessagingExtensionQuery(context: TurnContext, query: MessagingExtensionQuery): Promise<MessagingExtensionResponse> {
    // get the search query
    let searchQuery = "";
    if (query && query.parameters && query.parameters[0].name === "searchKeyword" && query.parameters[0].value) {
      searchQuery = query.parameters[0].value.trim().toLowerCase();
    }
  
    // search results
    let queryResults = foodtrucks.filter((ft) => ft.name.toLowerCase().indexOf(searchQuery) > -1 || ft.city.toLowerCase().indexOf(searchQuery) > -1);
  
    // get the results as cards
    let searchResultsCards: MessagingExtensionAttachment[] = [];
    queryResults.forEach((ft) => {
      searchResultsCards.push(this.getFoodTruckResultCard(ft));
    });
  
    let response: MessagingExtensionResponse = <MessagingExtensionResponse>{
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: searchResultsCards
      }
    };
  
    return Promise.resolve(response);
  }

  //
  // Utility to convert food truck search result to simple hero card
  //
  private getFoodTruckResultCard(foodtruck: any): MessagingExtensionAttachment {
    return CardFactory.heroCard(`${foodtruck.name} - ${foodtruck.city}`);
  }

}