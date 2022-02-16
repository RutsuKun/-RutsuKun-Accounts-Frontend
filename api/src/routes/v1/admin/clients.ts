import { Controller, Delete, Get, Inject, Post, Req, Res, UseBefore } from "@tsed/common";

// MIDDLEWARES

import { SessionMiddleware } from "@middlewares/session.middleware";
import { AccessTokenMiddleware } from "@middlewares/security";

// SERVICES

import { LoggerService } from "@services/LoggerService";
import { SessionService } from "@services/SessionService";
import { ClientService } from "@services/ClientService";

import { HTTPCodes } from "@utils";
import { ScopeMiddleware } from "@middlewares/scope.middleware";


@Controller("/admin/clients")
export class AdminClientsRoute {
  public logger: LoggerService;
  constructor(
    @Inject() private sessionService: SessionService,
    @Inject() private clientService: ClientService,
    @Inject() private loggerService: LoggerService
  ) {
    this.logger = this.loggerService.child({
      label: { name: "OAuth2", type: "oauth2" },
    });
  }

  @Get("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:clients"]))
  public async getAdminClients(@Req() request: Req, @Res() response: Res) {
    const clients = await this.clientService.getAdminClients(["account", "organization"]);

    const filtered = clients.map((client)=>{
        return {
            ...client,
            account: {
                uuid: client.account.uuid,
                username: client.account.username,
                avatar: client.account.avatar
            }
        }
    })

    response.status(HTTPCodes.OK).json(filtered);
  }

  @Post("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:clients"]))
  public async postClients(@Req() request: Req, @Res() response: Res) {
    const session = this.sessionService.getUser;
    const data = request.body;
    try {
      const client = await this.clientService.addAdminClient(response.user.sub, data);
      response.status(HTTPCodes.Created).json(client);
    } catch (err) {
      console.log('err', err);
      
      response.status(HTTPCodes.BadRequest).json({
        error: err,
      });
    }
  }

  @Delete("/:clientId")
  @UseBefore(SessionMiddleware)
  public deleteClients(@Req() request: Req, @Res() response: Res) {
    const session = this.sessionService.getUser;

    const clientId = request.params.clientId;

    this.clientService
      .getClientByClientId(clientId)
      .then((client) => {
        if (session.id === client.account.uuid) {
          this.clientService
            .deleteClient(clientId)
            .then(() => {
              response.status(HTTPCodes.OK).send();
            })
            .catch((error) => {
              response.status(HTTPCodes.BadRequest).json({
                error: error,
              });
            });
        } else {
          response.status(HTTPCodes.BadRequest).json({
            error: "Can you only delete your own application",
          });
        }
      })
      .catch((error) => {
        response.status(HTTPCodes.BadRequest).json({
          error: error,
        });
      });
  }

  @Get("/:clientId/public")
  public async getClientsPublic(@Req() request: Req, @Res() response: Res) {
    const clientId = request.params.clientId;
    try {
      const client = await this.clientService.getClientByClientId(clientId);
      response.status(HTTPCodes.OK).json({
        client_id: client.client_id,
        name: client.name,
        logo: client.logo,
        privacy_policy: client.privacy_policy,
        tos: client.tos,
        verified: client.verified,
        third_party: client.third_party,
        owner: {
          username: client.account.username,
          avatar: client.account.avatar,
        },
      });
    } catch (error) {
      response.status(HTTPCodes.BadRequest).json({
        error: error,
      });
    }
  }
}
