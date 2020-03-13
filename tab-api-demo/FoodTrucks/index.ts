import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import foodtrucks from './foodtrucks';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: {
            foodtrucks
        }
    };

};

export default httpTrigger;