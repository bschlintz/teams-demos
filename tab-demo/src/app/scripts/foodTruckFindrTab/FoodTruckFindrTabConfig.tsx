import * as React from "react";
import { Provider, Flex, Header, Input, Dropdown, DropdownItem, themes, ThemePrepared } from "@fluentui/react";
import TeamsBaseComponent, { ITeamsBaseComponentProps, ITeamsBaseComponentState } from "msteams-react-base-component";
import * as microsoftTeams from "@microsoft/teams-js";
import { parseUrl } from 'query-string';

export type FoodTruckConfigData = {
    location: string;
}

export interface IFoodTruckFindrTabConfigState extends ITeamsBaseComponentState {
    config?: FoodTruckConfigData;
    teamsTheme: ThemePrepared;
}

export interface IFoodTruckFindrTabConfigProps extends ITeamsBaseComponentProps {

}

export const serializeData = (data: FoodTruckConfigData): string => {
    try { return encodeURIComponent(JSON.stringify(data)); }
    catch { return ''; }
}

export const deserializeData = (dataStr: string): FoodTruckConfigData | undefined => {
    try { return JSON.parse(decodeURIComponent(dataStr)); }
    catch { return undefined; }
}

/**
 * Implementation of Food Truck Findr configuration page
 */
export class FoodTruckFindrTabConfig extends TeamsBaseComponent<IFoodTruckFindrTabConfigProps, IFoodTruckFindrTabConfigState> {

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

    public componentWillMount() {
        this._updateComponentTheme(this.getQueryVariable("theme"));
        this.setState({
            fontSize: this.pageFontSize()
        });

        if (this.inTeams()) {
            microsoftTeams.initialize();

            microsoftTeams.getContext((context: microsoftTeams.Context) => {
                microsoftTeams.settings.getSettings((settings) => {
                    const parsedContextUrl = settings && settings.contentUrl ? parseUrl(settings.contentUrl) : null;
                    const rawConfigData = parsedContextUrl ? parsedContextUrl.query['data'] as string : '';
                    const configData = deserializeData(rawConfigData);
                    this.setState({ config: configData });
                    this.updateTheme(context.theme);
                    this.setValidityState(true);
                })
            });

            microsoftTeams.settings.registerOnSaveHandler((saveEvent: microsoftTeams.settings.SaveEvent) => {
                // Calculate host dynamically to enable local debugging
                const host = "https://" + window.location.host;
                microsoftTeams.settings.setSettings({
                    contentUrl: host + `/foodTruckFindrTab/${this.state.config ? `?data=${serializeData(this.state.config)}` : ''}`,
                    suggestedDisplayName: "Food Truck Findr",
                    removeUrl: host + "/foodTruckFindrTab/remove.html",
                    entityId: 'food-truck-findr'
                });
                saveEvent.notifySuccess();
            });

            microsoftTeams.registerOnThemeChangeHandler(this._updateComponentTheme);
        } else {
        }
    }

    public render() {
        return (
            <Provider theme={this.state.theme}>
                <Flex fill={true}>
                    <Flex.Item>
                        <div>
                            <Header content="Configure your tab" />
                            <Dropdown
                                items={['Austin, TX', 'Denver, CO', 'Portland, OR', 'Seattle, WA']}
                                placeholder='Select a location'
                                value={this.state.config ? this.state.config.location : undefined}
                                onChange={(evt, props) => this.setState({ ...this.state, config: { ...this.state.config, location: props ? `${props.value}` : '' } })}
                            />
                        </div>
                    </Flex.Item>
                </Flex>
            </Provider>
        );
    }
}
