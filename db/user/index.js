import { ObjectId } from "mongodb";
import { getDB } from "../connection/index.js";

export async function listUsers (filter) {
  const { db, client } = await getDB();

  const users = await db.collection("users").aggregate([
    {"$match" : filter},
    {
      "$project" : 
      {
         _id:"$_id",
         name:"$user.name",
      }
   }
  ]).toArray();

  // const users = await db.collection("users").find(
  //   filter,
  //   {projection: {'user.name': 1}}  
  // ).toArray();

  client.close();

  return users;
}

export async function getUsers(filter) {
  try {
    const { db, client } = await getDB();

    const users = await db
      .collection("users")
      .aggregate([
        {
          $match: filter,
        },
        {
          $lookup: {
            from: "acl",
            localField: "teamId",
            foreignField: "teamId",
            as: "teamPermissions",
          },
        },
      ])
      .toArray();
    users.forEach((user) => {
      user.acl = {};
      user.teamPermissions.forEach((teamPermission) => {
        if (
          user.acl &&
          teamPermission.resourceId &&
          teamPermission.permission
        ) {
          user.acl[teamPermission.resourceId] = teamPermission.permission;
        }
      });
    });
    client.close();
    return users;
  } catch (e) {
    console.error(e);
  }
}

export async function getUser(filter) {
  const { db, client } = await getDB();
  const user = await db.collection("users").findOne(filter);
  client.close();
  return user;
}

export async function updateUser(filter, data) {
  const { db, client } = await getDB();

  const updatedUser = await db
    .collection("users")
    .updateOne(filter, { $set: data });
  client.close();
  return updatedUser;
}

export async function createUser (user) {
  try {
    const { db, client } = await getDB();

    const newUser = await db.collection("users").insertOne(user);

    client.close();

    return newUser;
  } catch (error) {
    console.error(error);

    return error;
  }
}

export async function getUserPermissions (accessToken) {
  const { db, client } = await getDB();

  const user = await db.collection("users").findOne({
    "accessToken": accessToken
  });

  if (!user) {
    throw new Error(`user not found with provided session`);
  }

  const roles = await db.collection("roles").find({
    "value": {
      "$in": user.role
    }
  }).toArray();

  if (!roles) {
    throw new Error(`user role not found`)
  }

  let finalPermissions = [];

  let allowedProjects = [];

  for (const role of roles) {
    const permissions = role.permissions;

    finalPermissions = finalPermissions.concat(permissions.filter((permission) => !finalPermissions.includes(permission)));
  }

  for (const role of roles) {
    if (role.value === "superAdmin") {
      const projectList = await db.collection("projects").find(
        {},
        {projection: {slug: 1}}
      ).toArray(); 

      allowedProjects = projectList.map(project => project.slug);

      break;
    }

    if (["designer", "admin"].includes(role.value)) {
      const projectList = await db.collection("projects").find({
        "consultantOrg": user.organisation
      },
      {projection: {slug: 1}}
      ).toArray();

      const projectSlugList = projectList.map(project => project.slug);

      allowedProjects = allowedProjects.concat(
        projectSlugList.filter
        (
          slug => !allowedProjects.includes(slug)
        )
      );
    }

    if (["designManager", "designViewer"].includes(role.value)) {
      const projectList = await db.collection("projects").find({
        "creatorOrg": user.organisation
      },
      {projection: {slug: 1}}
      ).toArray();

      const projectSlugList = projectList.map(project => project.slug);

      allowedProjects = allowedProjects.concat(
        projectSlugList.filter
        (
          slug => !allowedProjects.includes(slug)
        )
      );
    }
  }

  const acl = {
    role: user.role,
    permissions: finalPermissions,
    allowedProjects: allowedProjects,
    organisation: user.organisation,
  }

  client.close();

  return acl;
}
