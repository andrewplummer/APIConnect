<?php

$origin = $_SERVER['HTTP_ORIGIN'];

// Must set the EXACT origin to use withCredentials. "*" is not enough.
header("Access-Control-Allow-Origin: " . ($origin ? $origin : "*"));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Max-Age: 1728000");
header("Content-Type: application/json");

setcookie("om", "nom", time() + 3600);

?>
