import {
  describe,
  beforeEach,
  afterEach,
  expect,
  it,
  jest,
  beforeAll,
} from "@jest/globals";
import { Pool as MockPool } from "./__mocks__/pg.js";
import {
  injectDependencies,
  type InjectedFn,
} from "../testUtils/dependencies.js";

jest.unstable_mockModule(
  "../logger/index",
  () => import("../logger/__mocks__/index.js"),
);

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let NodesSql: InjectedFn["NodesSql"];
let NodesClient: InjectedFn["NodesClient"];
let testPool = new MockPool(dbConfig);
let client: InstanceType<InjectedFn["NodesClient"]>;

describe("Nodes DB", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    NodesSql = init.NodesSql;
    NodesClient = init.NodesClient;
  });

  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new NodesClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not update state", async () => {
      await expect(
        client.updateState("test-url", true, "new-v"),
      ).rejects.toThrowError("The table nodes is not initialized yet");
    });

    it("init error makes api unavailable", async () => {
      await expect(client.init()).rejects.toThrow();
      await expect(
        client.updateState("test-url", true, "new-v"),
      ).rejects.toThrowError("The table nodes is not initialized yet");
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(NodesSql.createTable, () => Promise.resolve());
      return client.init();
    });

    it("creates a new row if no results found", () => {
      const selfUrl = "some-self-url";
      const active = true;
      const version = "some-new-version";

      testPool.mockQuery(NodesSql.getRows, () => Promise.resolve({ rows: [] }));
      testPool.mockQuery(NodesSql.insertRow, (values) => {
        expect(values).toHaveLength(6);
        const [rNodeId, rSelfUrl, rActive, rVersion, rCreated, rUpdated] =
          values;

        expect(typeof rNodeId).toBe("string");
        expect(rSelfUrl).toBe(selfUrl);
        expect(rActive).toBe(active);
        expect(rVersion).toBe(version);
        expect(rCreated).toBe(rUpdated);

        return Promise.resolve({
          rows: [
            {
              node_id: rNodeId,
              self_url: rSelfUrl,
              is_active: rActive,
              version: rVersion,
              created_at: rCreated,
              updated_at: rUpdated,
            },
          ],
        });
      });

      return client.updateState(selfUrl, active, version).then((row) => {
        expect(typeof row.node_id).toBe("string");
        expect(row.self_url).toBe(selfUrl);
        expect(row.is_active).toBe(active);
        expect(row.version).toBe(version);
      });
    });

    it("fails to create the row if db did not return an item", async () => {
      const selfUrl = "some-self-url";
      const active = true;
      const version = "some-new-version";

      testPool.mockQuery(NodesSql.getRows, () => Promise.resolve({ rows: [] }));
      testPool.mockQuery(NodesSql.insertRow, (values) => {
        expect(values).toHaveLength(6);
        const [rNodeId, rSelfUrl, rActive, rVersion, rCreated, rUpdated] =
          values;

        expect(typeof rNodeId).toBe("string");
        expect(rSelfUrl).toBe(selfUrl);
        expect(rActive).toBe(active);
        expect(rVersion).toBe(version);
        expect(rCreated).toBe(rUpdated);

        return Promise.resolve({ rows: [] });
      });

      await expect(
        client.updateState(selfUrl, active, version),
      ).rejects.toThrowError("Unable to get created row info");
    });

    it("updates some existing row", () => {
      const selfUrl = "some-self-url-2";
      const active = true;
      const prevActive = false;
      const version = "some-new-version-2";
      const nodeId = "test-node";

      testPool.mockQuery(NodesSql.getRows, () =>
        Promise.resolve({
          rows: [
            {
              node_id: nodeId,
              self_url: selfUrl,
              is_active: prevActive,
              version: version,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }),
      );

      testPool.mockQuery(NodesSql.updateRow, (values) => {
        expect(values).toHaveLength(4);
        const [rActive, rVersion, rUpdated, rNodeId] = values;

        expect(rNodeId).toBe(nodeId);
        expect(rActive).toBe(active);
        expect(rVersion).toBe(version);

        return Promise.resolve({
          rows: [
            {
              node_id: rNodeId,
              self_url: selfUrl,
              is_active: rActive,
              version: rVersion,
              updated_at: rUpdated,
            },
          ],
        });
      });

      return client.updateState(selfUrl, active, version).then((row) => {
        expect(row.node_id).toBe(nodeId);
        expect(row.self_url).toBe(selfUrl);
        expect(row.is_active).toBe(active);
        expect(row.version).toBe(version);
      });
    });

    it("fails to update the row if db did not return an item", async () => {
      const selfUrl = "some-self-url-2";
      const active = true;
      const prevActive = false;
      const version = "some-new-version-2";
      const nodeId = "test-node";

      testPool.mockQuery(NodesSql.getRows, () =>
        Promise.resolve({
          rows: [
            {
              node_id: nodeId,
              self_url: selfUrl,
              is_active: prevActive,
              version: version,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }),
      );

      testPool.mockQuery(NodesSql.updateRow, (values) => {
        expect(values).toHaveLength(4);
        const [rActive, rVersion, , rNodeId] = values;

        expect(rNodeId).toBe(nodeId);
        expect(rActive).toBe(active);
        expect(rVersion).toBe(version);

        return Promise.resolve({
          rows: [],
        });
      });

      await expect(
        client.updateState(selfUrl, active, version),
      ).rejects.toThrowError("Unable to get updated row info");
    });
  });
});
