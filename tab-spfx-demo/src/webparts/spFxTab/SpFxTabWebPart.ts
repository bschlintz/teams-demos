import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneDropdown,
  IPropertyPaneDropdownOption
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'SpFxTabWebPartStrings';
import FoodTruckFindrTab, { IFoodTruckFindrTabProps } from './components/FoodTruckFindrTab';

export interface ISpFxTabWebPartProps {
  location: string;
}

export const locations: IPropertyPaneDropdownOption[] = [
  { key: 'Austin, TX', text: 'Austin, TX' },
  { key: 'Denver, CO', text: 'Denver, CO' },
  { key: 'Portland, OR', text: 'Portland, OR' },
  { key: 'Seattle, WA', text: 'Seattle, WA' },
]

export default class SpFxTabWebPart extends BaseClientSideWebPart <ISpFxTabWebPartProps> {

  public render(): void {
    const teamsContext = this.context && this.context.sdks && this.context.sdks.microsoftTeams && this.context.sdks.microsoftTeams.context ? this.context.sdks.microsoftTeams.context : null;
    const element: React.ReactElement<IFoodTruckFindrTabProps> = React.createElement(
      FoodTruckFindrTab,
      {
        location: this.properties.location,
        spfxContext: this.context,
        inTeams: !!teamsContext,
        teamsContext,
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected get disableReactivePropertyChanges(): boolean {
    return true;
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneDropdown('location', {
                  label: strings.DescriptionFieldLabel,
                  options: locations
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
