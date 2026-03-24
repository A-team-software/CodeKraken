import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const installData = req.body;

        // In a real app, you must save 'clientKey' and 'sharedSecret' 
        // from 'installData' to a database to sign future requests.
        console.log("------------------------------------------");
        console.log("App Installed on base URL:", installData.baseUrl);
        console.log("------------------------------------------");

        res.status(200).json({ success: true });
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
