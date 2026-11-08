# Sheggar Wheels API — .NET 8 container image.
# Render (Docker runtime) builds this file and runs the container; PORT is
# injected by the platform and Program.cs binds to it automatically.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY SheggarWheels.Api.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "SheggarWheels.Api.dll"]
