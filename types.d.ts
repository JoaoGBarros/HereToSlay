type Statistics = {
    cpuUsage : number, 
    ramUsage : number, 
    storageData : number, 
}

type StaticData = {
    totalStorage : number,
    cpuModel : string,
    totalMemoryGB : number
}

type EventPayload = {
    statistics: Statistics;
    staticData: StaticData;
}

type UnsubscribeFunction = () => void;

interface Window {
    electron: {
       subscribeStatistics: (callback: (data: Statistics) => void) => UnsubscribeFunction;
       getStaticData: () => Promise<StaticData>;
    }
}