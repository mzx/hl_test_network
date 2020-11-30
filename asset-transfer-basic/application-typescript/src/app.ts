import bodyParser from 'body-parser';
import express from 'express';
import { Gateway, GatewayOptions } from 'fabric-network';
import * as path from 'path';
import { buildCCPOrg1, buildWallet, prettyJSONString } from './utils//AppUtil';
import { buildCAClient, enrollAdmin, registerAndEnrollUser } from './utils/CAUtil';

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

let contract: any;

/**
 *  A test application to show basic queries operations with any of the asset-transfer-basic chaincodes
 *   -- How to submit a transaction
 *   -- How to query and check the results
 */
async function main() {
    try {
        const ccp = buildCCPOrg1();
        const caClient = buildCAClient(ccp, 'ca.org1.example.com');
        const wallet = await buildWallet(walletPath);
        await enrollAdmin(caClient, wallet, mspOrg1);
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

        const gateway = new Gateway();

        const gatewayOpts: GatewayOptions = {
            wallet,
            identity: org1UserId,
            discovery: {enabled: true, asLocalhost: true}, // using asLocalhost as this gateway is using a fabric network deployed locally
        };

        try {
            await gateway.connect(ccp, gatewayOpts);
            const network = await gateway.getNetwork(channelName);
            contract = network.getContract(chaincodeName);
            console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
            await contract.submitTransaction('InitLedger');
            console.log('*** Result: committed');
            let result;

            result = await contract.evaluateTransaction('GetAllAssets');
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        } finally {
            // gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
    }
}

main();
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.listen(5000, () => {
    const a = 'a';
});

app.get('/chaincode/acc/assetHistory/:id', async (req: any, res: any) => {
    try {
        const response = await contract.submitTransaction('GetAssetHistory', req.params.id);
        res.status(200).send(response);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.get('/chaincode/acc/:id', async (req: any, res: any) => {
    try {
        const response = await contract.submitTransaction('ReadAsset', req.params.id);
        res.status(200).send(response);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.delete('/chaincode/acc/:id', async (req: any, res: any) => {
    try {
        const response = await contract.submitTransaction('DeleteAsset', req.params.id);
        res.status(200).send(response);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.get('/chaincode/acc/', async (req: any, res: any) => {
    try {
        const response = await contract.evaluateTransaction('GetAllAssets');
        res.status(200).send(response);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.post('/chaincode/acc/', async (req: any, res: any) => {
    try {
        console.error(req.body);
        const {clinicName, doctorName, speciality} = req.body;
        const response = await contract.submitTransaction('CreateAsset',
            `accf${(+new Date()).toString(16)}`,
            clinicName,
            doctorName,
            'Applied',
            speciality);
        res.status(200).send(response);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.post('/chaincode/acc/updateStatus', async (req: any, res: any) => {
    try {
        console.error(req.body);
        const {id, status} = req.body;
        const response = await contract.submitTransaction('UpdateStatus',
            id, status);
        res.status(200).send(response);
    } catch (e) {
        res.status(500).json(e.message);
    }
});
