package org.anoga.bridges

import akka.actor.ActorSystem
import scala.concurrent.Future

class CustomHealthCheck(system: ActorSystem) extends (() => Future[Boolean]) {
  override def apply(): Future[Boolean] = {
    Future.successful(true)
  }
}
