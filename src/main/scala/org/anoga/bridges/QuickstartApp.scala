package org.anoga.bridges

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import akka.management.scaladsl.AkkaManagement
import com.typesafe.config.{Config, ConfigFactory}

import scala.util.Failure
import scala.util.Success

//#main-class
object QuickstartApp {
  //#start-http-server
  private def startHttpServer(routes: Route)(implicit system: ActorSystem[_]): Unit = {
    // Akka HTTP still needs a classic ActorSystem to start
    import system.executionContext

    val port = System.getProperty("service.overridePort", "8080").toInt
    val futureBinding = Http().newServerAt("localhost", port).bind(routes)
    futureBinding.onComplete {
      case Success(binding) =>
        val address = binding.localAddress
        system.log.info("Server online at http://{}:{}/", address.getHostString, address.getPort)
      case Failure(ex) =>
        system.log.error("Failed to bind HTTP endpoint, terminating system", ex)
        system.terminate()
    }
  }
  //#start-http-server
  def main(args: Array[String]): Unit = {
    //#server-bootstrapping
    val managementPort: Int = System.getProperty("management.overridePort", "0").toInt
    val rootBehavior = Behaviors.setup[Nothing] { context =>
      val userRegistryActor = context.spawn(UserRegistry(), "UserRegistryActor")
      context.watch(userRegistryActor)

      val routes = new UserRoutes(userRegistryActor)(context.system)
      startHttpServer(routes.allRoutes)(context.system)

      Behaviors.empty
    }

    val config: Config = ConfigFactory
      .parseString(s"akka.management.http.port=$managementPort")
      .withFallback(ConfigFactory.load())
      .resolve()

    val system =
      if (managementPort != 0) ActorSystem[Nothing](rootBehavior, "HelloAkkaHttpServer", config)
      else ActorSystem[Nothing](rootBehavior, "HelloAkkaHttpServer")

    //#server-bootstrapping
    AkkaManagement(system).start()
  }
}
//#main-class
