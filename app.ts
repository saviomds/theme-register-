
import express from "express"


import { PrismaClient } from "@prisma/client"
import { Resend } from "resend";


import bcrypt from "bcryptjs";
const prisma = new PrismaClient()
const app = express();
app.use(express.json());
app.use(express.urlencoded());
const resend = new Resend(process.env.RESEND_API);

app.post("/auth/register", async (req, res) => {
    const hashedpasswprd = bcrypt.hashSync(req.body.password, 10);
    const data = {
        "password": hashedpasswprd,
        "email": req.body.email,
        "name": req.body.name
    };
    const token = randomIntegerInRange(4000, 9999);
    const user = await prisma.user.findFirst({
        where: {
            email: data.email,
        }
    });
    if (!user) {
        await RegisterUser({ data, token });
        res.redirect('http://localhost:5500/frontend/verify.html');
    }
    else{
        res.send('Email already exists')
    }


});
app.post("/auth/code", async (req,res)=>{
    const data = {
        "code":req.body.code,
    };
    const verificationTokens = await prisma.verificationToken.findMany({
        where:{
            token: data.code,
            
        }
    });

    if(verificationTokens.length > 0) {
        await prisma.verificationToken.deleteMany({
            where: {
                token: data.code,
            }
        });
        await prisma.user.update({
            where: {
                id: verificationTokens[0].identifier,
            },
            data: {
                emailVerified:new Date()
            }
        })
        res.redirect('http://localhost:5500/frontend/login.html')
    }

    else{
        res.send('Invalid Code')
    }
});

async function RegisterUser({
    data,
    token
}: {
    data: {
        email: string,
        name: string,
        password: string
    },
    token: number
}) {

    const user = await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            password: data.password
        }
    });

    await prisma.verificationToken.create({
        data: {
            token: String(token),
            expires: new Date(),
            identifier: user.id,
        }
    });
    await SendEmail({
        token: String(token),
    });
}
async function SendEmail({
    token
}: {
    token: string
}) {
    await resend.emails.send({
        from: 'Acme <onboarding@email1.uhost.pro>',
        to: ['rumanzibonheur@gmail.com'],
        subject: 'Your verfication code is ' + token,
        text: 'Verfications COde!',
        headers: {
            'X-Entity-Ref-ID': '123456789',
        },
        tags: [
            {
                name: 'category',
                value: 'confirm_email',
            },
        ],
    });
}
app.listen(8080, () => {
    console.log("Server is running on port 8080");
});

const randomIntegerInRange = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;