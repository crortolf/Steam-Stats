//a stand-in for the mongodb package so services can be loaded without a database
//use with:
//  const mockCollections = {};
//  jest.mock("mongodb", () => require("./helpers/mockMongo")(mockCollections));
//each collection the service asks for is created on demand, and the test can
//reach it as mockCollections["Name"] to set return values and check calls.
//ObjectId and the rest of the real package are kept

//find() returns a chainable cursor; set what it resolves to with
//collection.find.mockReturnValue(cursorOf([...docs]))
const cursorOf = (docs = []) => {
  const cursor = {
    sort: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    project: jest.fn(() => cursor),
    toArray: jest.fn().mockResolvedValue(docs),
  };
  return cursor;
};

const makeCollection = () => ({
  createIndex: jest.fn().mockResolvedValue("index"),
  find: jest.fn(() => cursorOf([])),
  findOne: jest.fn().mockResolvedValue(null),
  insertOne: jest.fn().mockResolvedValue({ insertedId: "id" }),
  updateOne: jest.fn().mockResolvedValue({}),
  updateMany: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  countDocuments: jest.fn().mockResolvedValue(0),
});

const mockMongo = (collections) => {
  const actual = jest.requireActual("mongodb");
  const db = {
    collection: (name) => (collections[name] ??= makeCollection()),
  };
  return {
    ...actual,
    MongoClient: jest.fn(() => ({ db: () => db })),
  };
};

mockMongo.cursorOf = cursorOf;
module.exports = mockMongo;
