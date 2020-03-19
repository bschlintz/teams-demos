import * as React from "react";
import { Stack } from "office-ui-fabric-react/lib/Stack";
import { ShimmeredDetailsList } from "office-ui-fabric-react/lib/ShimmeredDetailsList";
import * as microsoftTeams from "@microsoft/teams-js";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SPHttpClient } from "@microsoft/sp-http";
import { SelectionMode } from "office-ui-fabric-react/lib/Utilities";

export interface FoodTruck {
    id: number;
    name: string;
    likes: number;
    savory: boolean;
    sweet: boolean;
    vegetarian: boolean;
    bookable: boolean;
    city: string;
}

export interface IFoodTruckFindrTabState {
    foodtrucks: FoodTruck[];
    isLoading: boolean;
}

export interface IFoodTruckFindrTabProps {
    location: string;
    inTeams: boolean;
    teamsContext: microsoftTeams.Context;
    spfxContext: WebPartContext;
}

export default class FoodTruckFindrTab extends React.Component<IFoodTruckFindrTabProps, IFoodTruckFindrTabState> {

    constructor(props: any, state: IFoodTruckFindrTabState) {
        super(props, state);
        this.state = {
            ...state,
            foodtrucks: [],
            isLoading: false,
        };
    }

    private _loadFoodTrucks = async () => {

        const { spfxContext } = this.props;

        this.setState({ isLoading: true });
        const tokenProvider = await spfxContext.aadTokenProviderFactory.getTokenProvider();
        const accessToken = await tokenProvider.getToken('a718af7a-1b75-4493-959b-6ee1435acfd5');

        // Fetch food trucks
        if (accessToken) {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await spfxContext.httpClient.get('https://tdct.azurewebsites.net/api/FoodTrucks', SPHttpClient.configurations.v1, { headers });

            // Check valid response
            if (!response.ok) throw new Error(`[${response.status}] ${response.statusText}`);

            let data = await response.json();
            let foodtrucks: FoodTruck[] = data.foodtrucks;

            this.setState({ foodtrucks, isLoading: false });
        }
        else throw new Error(`No access token - unable to fetch food trucks`);
    }

    private _renderFoodTrucks = (isLoading: boolean, foodtrucks: FoodTruck[] = []) => {
        const { location } = this.props;
        return (
            <ShimmeredDetailsList
                enableShimmer={isLoading}
                selectionMode={SelectionMode.none}
                columns={[
                    { key: 'name', fieldName: 'name', name: 'Name', minWidth: 100 },
                    { key: 'likes', fieldName: 'likes', name: 'Likes', minWidth: 100 },
                    { key: 'sweet', fieldName: 'sweet', name: 'Is Sweet', minWidth: 100 },
                    { key: 'savory', fieldName: 'savory', name: 'Is Savory', minWidth: 100 },
                    { key: 'vegetarian', fieldName: 'vegetarian', name: 'Is Vegetarian', minWidth: 100 },
                ]}
                items={foodtrucks.filter(ft => ft.city === location).map((ft, idx) => {
                    return {
                        ...ft,
                        key: idx,
                        sweet: ft.sweet ? "Yes" : "No",
                        savory: ft.savory ? "Yes" : "No",
                        vegetarian: ft.vegetarian ? "Yes" : "No",
                    };
                })}
            />
        );
    }

    public async componentWillMount() {
        this._loadFoodTrucks();
    }

    public render() {
        const { isLoading, foodtrucks } = this.state;
        const { location } = this.props;
        return (
            <Stack>
                <Stack>
                    <h1>{`Food Trucks in ${location || '¯\\_(ツ)_/¯'}`}</h1>
                </Stack>
                <Stack>
                    <Stack horizontalAlign="center">
                        {this._renderFoodTrucks(isLoading, foodtrucks)}
                    </Stack>
                </Stack>
            </Stack>
        );
    }
}
