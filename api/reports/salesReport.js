import dayjs from "dayjs";
import { getDB } from "../../db/connection/index.js";
import lodash from "lodash";

function getListing(reportData) {
  const listing = {};
  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const services = {};
  const departments = {};
  reportData.forEach((rd) => {
    let total = 0;
    let sales = 0;
    let taxes = 0;
    let datum = { NAME: rd.PARTYLEDGERNAME };
    const date = new Date(rd.DATE);
    const dateKey = `${date.getDate()}-${
      months[date.getMonth()]
    }-${date.getFullYear()}`;
    if (rd.INVENTORIES) {
      rd.INVENTORIES.forEach((ld) => {
        total += ld.AMOUNT;
        datum[ld.STOCKITEMNAME] = ld.AMOUNT;
        if (services[ld.STOCKITEMNAME]) {
          services[ld.STOCKITEMNAME] += lodash.round(ld.AMOUNT, 2);
        } else {
          services[ld.STOCKITEMNAME] = ld.AMOUNT;
        }

        if (departments[ld.DEPARTMENT]) {
          departments[ld.DEPARTMENT] += lodash.round(ld.AMOUNT, 2);
        } else {
          departments[ld.DEPARTMENT] = ld.AMOUNT;
        }
        
      });
    }
    if (rd.LEDGERENTRIES) {
      rd.LEDGERENTRIES.forEach((ld) => {
        if (ld.LEDGERNAME !== rd.PARTYLEDGERNAME) {
          if (ld.LEDGERNAME.indexOf("GST") < 0) {
            total += ld.AMOUNT;
            datum[ld.LEDGERNAME] = ld.AMOUNT;
            if (services[ld.LEDGERNAME]) {
              services[ld.LEDGERNAME] += lodash.round(ld.AMOUNT, 2);
            } else {
              services[ld.LEDGERNAME] = ld.AMOUNT;
            }
            if (departments[ld.DEPARTMENT]) {
              departments[ld.DEPARTMENT] += lodash.round(ld.AMOUNT, 2);
            } else {
              departments[ld.DEPARTMENT] = ld.AMOUNT;
            }
            
          } else {
            taxes += ld.AMOUNT;
          }
        } else {
          sales = ld.AMOUNT * -1;
        }
      });
    }

    datum.TOTAL = total || sales;
    if (!listing[rd.PARTYLEDGERNAME]) {
      listing[rd.PARTYLEDGERNAME] = { [dateKey]: datum };
    } else {
      listing[rd.PARTYLEDGERNAME][dateKey] = datum;
    }
  });
  return [listing, services, departments];
}

function getSummary(listing, services, departments) {
  const summary = {
    grandTotal: 0,
    numberOfClients: 0,
    numberOfServices: Object.keys(services).length,
  };
  const sortedServices = [];
  const sortedDepartments = [];
  const sortedListings = [];
  for (const customer in listing) {
    ++summary.numberOfClients;
    const customerSales = { Name: customer };
    let total = 0;
    const items = [];
    for (const date in listing[customer]) {
      summary.grandTotal += listing[customer][date].TOTAL;
      total += listing[customer][date].TOTAL;
      for (const key in listing[customer][date]) {
        if (key !== "NAME" && key !== "TOTAL") {
          items.push({
            SERVICENAME: key,
            SALEPRICE: listing[customer][date][key],
            DATE: date,
          });
        }
      }
      if (total > 0) {
        sortedListings.push({
          NAME: customer,
          TOTALSALES: total,
          ITEMS: items,
        });
      }
    }
  }
  for (const service in services) {
    sortedServices.push({
      name: service,
      sales: lodash.round(services[service], 2),
    });
  }
  for (const department in departments) {
    sortedDepartments.push({
      name: department,
      sales: lodash.round(departments[department], 2),
    });
  }

  return [
    summary,
    lodash.orderBy(sortedServices, ["sales"], ["desc"]),
    lodash.orderBy(sortedListings, ["TOTALSALES"], ["desc"]),
    lodash.orderBy(sortedDepartments, ["sales"], ["desc"]),
  ];
}


export default async function getSalesReport(req, res) {
  const { db, client } = await getDB();
  const date = dayjs();
  let month = date.month();
  let year = date.year();
  let startDate = date.startOf("month").format("YYYY-MM-DD");
  let endDate = date.endOf("month").format("YYYY-MM-DD");
  // get month from Query
  if(req.query.month) {
    month = req.query.month
  }

  // get year from Query
  if(req.query.year) {
    year = req.query.year
  }

  const newDate = dayjs(`${year}-${month}-01`)
  startDate = newDate.startOf("month").format("YYYY-MM-DD");
  endDate = newDate.endOf("month").format("YYYY-MM-DD");

  // get start date from Query
  if(req.query.from) {
    startDate = req.query.from
  }

  // get end date from Query
  if(req.query.to) {
    endDate = req.query.to
  }
  

  const dbQuery = [{ VCHTYPE: {$in:['Sales','Credit Note']} }];
  dbQuery.push({ DATE: { $gte:  new Date(startDate)} });
  dbQuery.push({ DATE: { $lte:  new Date(endDate)} });
  console.log(JSON.stringify(dbQuery));

  const reportData = await db
    .collection("vouchers")
    .find({ $and: dbQuery })
    .project(["PARTYLEDGERNAME", "LEDGERENTRIES", "INVENTORIES", "DATE"])
    .sort({ DATE: -1 })
    .toArray();
  const [listing, services, departments] = getListing(reportData);
  const [summary, sortedServices, sortedListings, sortedDepartments] = getSummary(
    listing,
    services,
    departments
  );
  client.close();

  res
    .status(200)
    .json({ summary, departments: sortedDepartments, services: sortedServices, listing: sortedListings });
}
