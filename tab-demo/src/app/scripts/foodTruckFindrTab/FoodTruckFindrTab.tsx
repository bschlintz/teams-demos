import * as React from "react";
import { Provider, Flex, Text, Button, Header, ThemePrepared, themes, Loader, Table, TableRow, TableCell } from "@fluentui/react";
import TeamsBaseComponent, { ITeamsBaseComponentProps, ITeamsBaseComponentState } from "msteams-react-base-component";
import * as microsoftTeams from "@microsoft/teams-js";
import { FoodTruckConfigData, deserializeData } from "./FoodTruckFindrTabConfig";
import 'whatwg-fetch';

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

export interface IFoodTruckFindrTabState extends ITeamsBaseComponentState {
    entityId: string;
    config?: FoodTruckConfigData;
    foodtrucks: FoodTruck[];
    accessToken: string;
    showLoadButton: boolean;
}

export class FoodTruckFindrTab extends TeamsBaseComponent<{}, IFoodTruckFindrTabState> {

    constructor(props: any, state: IFoodTruckFindrTabState) {
        super(props, state);
        this.state = {
            ...state,
            entityId: '',
            foodtrucks: [],
            accessToken: '',
            showLoadButton: false,
        };
    }

    private _updateComponentTheme = (teamsTheme: string = "default"): void => {
        let componentTheme: ThemePrepared;

        switch (teamsTheme) {
            case "default":
                componentTheme = themes.teams;
                break;
            case "dark":
                componentTheme = themes.teamsDark;
                break;
            case "contrast":
                componentTheme = themes.teamsHighContrast;
                break;
            default:
                componentTheme = themes.teams;
                break;
        }
        // update the state
        this.setState(Object.assign({}, this.state, {
            teamsTheme: componentTheme
        }));
    }

    private _init = async (): Promise<boolean> => {
        let inTeamsContext = false;
        try {
            this._updateComponentTheme(this.getQueryVariable("theme"));
    
            const rawConfigData = this.getQueryVariable("data");
            const config = rawConfigData ? deserializeData(rawConfigData) : undefined;
            this.setState({
                fontSize: this.pageFontSize(),
                config
            });
    
            if (this.inTeams()) {
                inTeamsContext = true;
                microsoftTeams.initialize();
                microsoftTeams.registerOnThemeChangeHandler(this._updateComponentTheme);
                microsoftTeams.getContext((context) => {
                    this.setState({
                        entityId: context.entityId
                    });
                    this.updateTheme(context.theme);
                });            
            } else {
                this.setState({
                    entityId: "This is not hosted in Microsoft Teams"
                });
            }
        }
        catch (error) { }
        finally {
            return inTeamsContext;
        }
    }

    private _fetchFoodtrucks = async (location: string, accessToken: string): Promise<FoodTruck[]> => {
        // Check access token
        if (!accessToken) throw new Error(`No access token - unable to fetch food trucks`);

        const response = await fetch('https://tdct.azurewebsites.net/api/FoodTrucks', { headers: { Authorization: `Bearer ${accessToken}`}});

        // Check valid response
        if (!response.ok) throw new Error(`[${response.status}] ${response.statusText}`);

        let data = await response.json();
        let foodtrucks: FoodTruck[] = data.foodtrucks;
        foodtrucks = foodtrucks.filter(ft => ft.city === location);
        return foodtrucks;
    }

    private _getTeamsContext = async (): Promise<microsoftTeams.Context> => {
        return new Promise((resolve, reject) => {
            microsoftTeams.getContext(ctx => resolve(ctx));
        })
    }

    private _getAccessTokenPrompt = async (): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
            microsoftTeams.authentication.authenticate({
                url: window.location.origin + "/auth-start.html",
                width: 600,
                height: 535,
                successCallback: (accessToken: string) => {
                    resolve(accessToken);
                },
                failureCallback: (reason) => {
                    reject(reason);
                }
            });
        });
    }

    private _getAccessTokenSilently = async (): Promise<string> => {
        return new Promise<string>(async (resolve, reject) => {
            const teamsContext = await this._getTeamsContext();
            let config = {
                clientId: "a718af7a-1b75-4493-959b-6ee1435acfd5",
                redirectUri: window.location.origin + "/auth-end.html",
                cacheLocation: "localStorage",
                endpoints: {
                  api: "https://tdct.azurewebsites.net"
                }
              };
            let authContext = new window['AuthenticationContext'](config); // from the ADAL.js library
            // See if there's a cached user and it matches the expected user
            let user = authContext.getCachedUser();
            if (user) {
                if (user.profile.oid !== teamsContext.userObjectId) {
                    // User doesn't match, clear the cache
                    authContext.clearCache();
                }
            }
    
            // In this example we are getting an id token (which ADAL.js returns if we ask for resource = clientId)
            authContext.acquireToken(config.clientId, function (errDesc, token, err, tokenType) {
                if (token) {
                    // Make sure ADAL gave us an id token
                    if (tokenType !== authContext.CONSTANTS.ID_TOKEN) {
                        token = authContext.getCachedToken(config.clientId);
                    }
                    resolve(token);
                } else {
                    // Failed to get the token silently; show the login button
                    reject(err);
                    // You could attempt to launch the login popup here, but in browsers this could be blocked by
                    // a popup blocker, in which case the login attempt will fail with the reason FailedToOpenWindow.
                }
            });
        });
    }

    private _loadFoodTrucks = async (promptConsent: boolean = false) => {

        const { config, accessToken: existingAccessToken } = this.state;
        let accessToken = existingAccessToken;

        if (promptConsent || !accessToken) {
            if (promptConsent) {
                accessToken = await this._getAccessTokenPrompt();
            }
            else {
                try {
                    accessToken = await this._getAccessTokenSilently();
                }
                catch (error) {
                    this._loadFoodTrucks(true);
                }
            }
        }

        // Fetch food trucks
        if (config && accessToken) {
            const foodtrucks = await this._fetchFoodtrucks(config.location, accessToken);
            this.setState({ foodtrucks, showLoadButton: false, accessToken });
        }
    }

    private _onClickLoad = () => {
        this._loadFoodTrucks(false);
    }

    private _renderLoadButton = () => {
        return (
            <Flex.Item>
                <Button onClick={this._onClickLoad}>Load Food Trucks</Button>
            </Flex.Item>
        )
    }

    private _renderFoodTrucks = (isLoading: boolean, foodtrucks: FoodTruck[] = []) => {
        return (<>
            {isLoading
                ?   <Flex.Item grow>
                        <Loader/>
                    </Flex.Item>
                : <Flex.Item grow>
                    <Table
                        style={{width: '90%'}}
                        header={{
                            key: 'header', 
                            items: [
                                { key: 'name', content: 'Name' },
                                { key: 'likes', content: 'Likes' },
                                { key: 'sweet', content: 'Is Sweet' },
                                { key: 'savory', content: 'Is Savory' },
                                { key: 'vegetarian', content: 'Is Vegetarian' },
                            ]
                        }}
                        rows={foodtrucks.map((ft, idx) => ({
                            key: idx,
                            items: [
                                { key: 'name', content: ft.name,  },
                                { key: 'likes', content: ft.likes },
                                { key: 'sweet', content: ft.sweet ? "Yes" : "No" },
                                { key: 'savory', content: ft.savory ? "Yes" : "No" },
                                { key: 'vegetarian', content: ft.vegetarian ? "Yes" : "No" },
                            ]
                        }))}
                    />
                </Flex.Item>
                
            }
        </>);
    }

    public async componentWillMount() {
        await this._init();
        try {
            const { config } = this.state;
            if (config) {
                const token = await this._getAccessTokenSilently();                
                const foodtrucks = await this._fetchFoodtrucks(config.location, token);
                this.setState({ foodtrucks, showLoadButton: false, accessToken: token });
            }
            else {
                this.setState({ showLoadButton: true });
            }
        }   
        catch (error) {
            this.setState({ showLoadButton: true });
        }
    }

    public render() {
        const { showLoadButton, foodtrucks } = this.state;
        return (
            <Provider theme={this.state.theme}>
                <Flex fill={true} column styles={{
                    padding: ".8rem 0 .8rem .5rem"
                }}>
                    <Flex.Item>
                        <Header content={`Food Trucks in ${this.state.config ? this.state.config.location : '¯\\_(ツ)_/¯'}`} />
                    </Flex.Item>
                    <Flex.Item>
                        <Flex column hAlign="center">
                            {this.inTeams()
                                ? showLoadButton
                                    ? this._renderLoadButton()
                                    : this._renderFoodTrucks(!foodtrucks, foodtrucks)
                                : <Flex.Item><Text content="Not in a Teams context." /></Flex.Item>
                            }
                        </Flex>
                    </Flex.Item>
                </Flex>
            </Provider>
        );
    }
}
