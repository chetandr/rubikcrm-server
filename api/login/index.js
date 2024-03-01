import 'dotenv/config';

import { getUser, getUserPermissions, updateUser } from "../../db/user/index.js";
import { request, response } from "express";

import { OAuth2Client } from "google-auth-library";

const authClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

export async function getGoogleAuthUrl (
  req,
  res
) {
  try {
    let { redirectPath } = req.body;

    if (!redirectPath) {
      redirectPath = `http://${process.env.API_BASE_URI}`;
    }

    console.log(redirectPath);

    const authUrl = authClient.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
      ],
      redirect_uri: redirectPath,
      prompt: "select_account",
    })
    console.log(authUrl, " ::::",process.env.GOOGLE_CLIENT_ID, " ::::",
      process.env.GOOGLE_CLIENT_SECRET,);
    if (!authUrl) {
      throw new Error("authentication url could not be generated");
    }

    return res.status(200).json({
      url: authUrl,
    })
  } catch (error) {
    console.error(error);

    return res.status(400).json(error);
  }
}

export async function getGToken (
  req, res
) {
  try {
    const { code, redirectPath } = req.body;
  if (!code) {
    throw new Error("no code found");
  }

  if (!redirectPath) {
    throw new Error("no redirectPath found");
  }

  const response = await authClient.getToken({
    code: code,
    redirect_uri: redirectPath,
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  const { access_token: token, id_token: idToken, refresh_token: refreshToken } = response.tokens;

  if (!token) {
    throw new Error("unauthorized request");
  }

  const userInfo = await authClient.getTokenInfo(token);

  if (!userInfo) {
    throw new Error("user info could not be fetched");
  }

  authClient.setCredentials(response.tokens);

  const url = 'https://people.googleapis.com/v1/people/me?personFields=names,photos';

  const profile = await authClient.request({url});

  if (!profile) {
    throw new Error("user data could not be found");
  }

  const { givenName: firstName } = profile.data.names[0];

  const { url: image } = profile.data.photos[0];

  const user = await getUser({
    "user.email": userInfo.email
  })

  if (!user) {
    //TBD: should we create new user on the fly!
    throw new Error("user not found");
  }

  user.user.image =  image;

  user.user.firstName = firstName;

  user.accessToken = token;

  user.expires = userInfo.expiry_date;

  user.idToken = idToken;

  user.refreshToken = refreshToken;

  const save = await updateUser({
    "user.email": userInfo.email
  }, user);

  if (!save) {
    throw new Error("something went wrong");
  }

  const acl = await getUserPermissions(user.accessToken);

  if (!acl) {
    throw new Error("acl could not be found");
  }

  return res.status(200).json({
    user: {
      id: user._id,
      name: user.user.name,
      email: userInfo.email,
      accessToken: token,
      idToken: idToken,
      expires: userInfo.expiry_date,
      image: image,
      firstName: firstName,
      acl: acl
    },
    route: "/projects"
  })
  } catch (error) {
    console.log(error);

    return res.status(400).json(error);
  }
}

export async function verifyToken (
  req, res
) {
  try {
    const { token } = req.body;

    if (!token) {
      throw new Error("token not found");
    }

    const verification = await authClient.getTokenInfo(token);

    if (!verification) {
      throw new Error("invalid token");
    }

    return res.status(200).json({
      token: token
    })
  } catch (error) {
    return res.status(400).json(error);
  }
}

export async function refreshToken (
  req, res
) {
  try {
    const { email, idToken } = req.body;

    if (!email || !idToken) {
      throw new Error("email or token not provided")
    }

    const user = await getUser({
      "user.email": email,
    })

    if (!user) {
      throw new Error(`user with email ${email} not found`);
    }

    const freshToken = await authClient.refreshToken(user.refreshToken);

    const { expiry_date, access_token, id_token } = freshToken.tokens;

    user.expires = expiry_date;

    user.accessToken = access_token;

    user.idToken = id_token;

    const save = await updateUser({
      "user.email": email
    }, user);
  
    if (!save) {
      throw new Error("user could not be saved");
    }

    const acl = await getUserPermissions(user.accessToken);

    if (!acl) {
      throw new Error(`acl could not found`);
    }
  
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.user.name,
        email: user.user.email,
        accessToken: access_token,
        idToken: id_token,
        expires: expiry_date,
        image: user.user.image,
        acl: acl,
      },
      route: "/projects"
    })
  } catch (error) {
    return res.status(400).json(error);
  }
}

export async function checkSession (accessToken) {
  const verification = await authClient.getTokenInfo(accessToken);

  if (!verification) {
    throw new Error("invalid token");
  }

  return verification;
}