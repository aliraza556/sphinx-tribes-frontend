import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Feature, Ticket } from 'store/interface';
import MaterialIcon from '@material/react-material-icon';
import TicketEditor from 'components/common/TicketEditor/TicketEditor';
import { useStores } from 'store';
import { v4 as uuidv4 } from 'uuid';
import {
  FeatureBody,
  FeatureDataWrap,
  FieldWrap,
  PhaseLabel,
  LabelValue,
  AddTicketButton
} from 'pages/tickets/style';
import { SOCKET_MSG } from 'config/socket';
import { createSocketInstance } from 'config/socket';
import { phasePlannerStore } from '../../store/PhasePlanner';
import {
  FeatureHeadNameWrap,
  FeatureHeadWrap,
  WorkspaceName,
  PhaseFlexContainer,
  ActionButton
} from './workspace/style';
import { Phase } from './workspace/interface';

interface PhasePlannerParams {
  feature_uuid: string;
  phase_uuid: string;
}

interface TicketData {
  uuid: string;
  feature_uuid: string;
  phase_uuid: string;
  name: string;
  sequence: number;
  dependency: string[];
  description: string;
  status: string;
  version: number;
  number: number;
}

const PhasePlannerView: React.FC = () => {
  const { feature_uuid, phase_uuid } = useParams<PhasePlannerParams>();
  const [featureData, setFeatureData] = useState<Feature | null>(null);
  const [phaseData, setPhaseData] = useState<Phase | null>(null);
  const [ticketData, setTicketData] = useState<TicketData[]>([]);
  const { main } = useStores();
  const history = useHistory();

  useEffect(() => {
    const socket = createSocketInstance();

    socket.onopen = () => {
      console.log('Socket connected in Phase Planner');
    };

    socket.onmessage = (event: MessageEvent) => {
      const res = JSON.parse(event.data);
      if (res.msg === SOCKET_MSG.user_connect) {
        const sessionId = res.body;
        console.log(`Websocket Session ID: ${sessionId}`);
      }

      if (res.msg === SOCKET_MSG.ticket_update && res.body) {
        const updatedTicket = res.body;

        setTicketData((prevTickets: TicketData[]) =>
          prevTickets.map((ticket: TicketData) =>
            ticket.uuid === updatedTicket.uuid ? { ...ticket, ...updatedTicket } : ticket
          )
        );
        phasePlannerStore.updateTicket(updatedTicket.uuid, updatedTicket);
      }
    };

    socket.onclose = () => {
      console.log('Socket disconnected in Phase Planner');
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const getFeatureData = useCallback(async () => {
    if (!feature_uuid) return;
    const data = await main.getFeaturesByUuid(feature_uuid);

    return data;
  }, [feature_uuid, main]);

  const getPhaseData = useCallback(async () => {
    if (!feature_uuid || !phase_uuid) return;
    const data = await main.getFeaturePhaseByUUID(feature_uuid, phase_uuid);

    return data;
  }, [feature_uuid, phase_uuid, main]);

  const getPhaseTickets = useCallback(async () => {
    if (!feature_uuid || !phase_uuid) return;
    const data = await main.getTicketDataByPhase(feature_uuid, phase_uuid);

    return data;
  }, [feature_uuid, phase_uuid, main]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const feature = await getFeatureData();
        const phase = await getPhaseData();
        const phaseTickets = await getPhaseTickets();

        if (!feature || !phase || !Array.isArray(phaseTickets)) {
          history.push('/');
        } else {
          const parsedTicketData: TicketData[] = [];
          for (let i = 0; i < phaseTickets.length; i++) {
            const ticket = phaseTickets[i];
            if (ticket.UUID) {
              ticket.uuid = ticket.UUID;
            }
            parsedTicketData.push({ ...ticket });
          }
          setFeatureData(feature);
          setPhaseData(phase);
          setTicketData(parsedTicketData);
          phasePlannerStore.setTickets(parsedTicketData as Ticket[]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        history.push('/');
      }
    };

    fetchData();
  }, [getFeatureData, getPhaseData, history, getPhaseTickets]);

  const handleClose = () => {
    history.push(`/feature/${feature_uuid}`);
  };

  const addTicketHandler = async () => {
    const newTicketUuid = uuidv4();
    const initialTicketData = {
      uuid: newTicketUuid,
      feature_uuid,
      phase_uuid,
      name: '',
      sequence: 0,
      dependency: [],
      description: '',
      status: 'DRAFT',
      version: 1
    };

    try {
      await main.createUpdateTicket(initialTicketData);
      setTicketData((prevTickets: TicketData[]) => [
        ...prevTickets,
        {
          uuid: newTicketUuid,
          feature_uuid,
          phase_uuid,
          name: '',
          sequence: prevTickets.length + 1,
          dependency: [],
          description: '',
          status: 'DRAFT',
          version: 1,
          number: prevTickets.length + 1
        }
      ]);
    } catch (error) {
      console.error('Error registering ticket:', error);
    }
  };

  return (
    <FeatureBody>
      <FeatureHeadWrap>
        <FeatureHeadNameWrap>
          <MaterialIcon
            onClick={handleClose}
            icon={'arrow_back'}
            style={{
              fontSize: 25,
              cursor: 'pointer'
            }}
          />
          <WorkspaceName>Phase Planner</WorkspaceName>
        </FeatureHeadNameWrap>
      </FeatureHeadWrap>
      <FeatureDataWrap>
        <FieldWrap>
          <PhaseFlexContainer>
            <PhaseLabel>
              Feature Name: <LabelValue>{featureData?.name}</LabelValue>
            </PhaseLabel>
            <PhaseLabel>
              Phase: <LabelValue>{phaseData?.name}</LabelValue>
            </PhaseLabel>
            {ticketData.map((ticketData: TicketData) => (
              <TicketEditor key={ticketData.uuid} ticketData={ticketData} />
            ))}
            <AddTicketButton>
              <ActionButton
                color="primary"
                onClick={addTicketHandler}
                data-testid="audio-generation-btn"
              >
                Add Ticket
              </ActionButton>
            </AddTicketButton>
          </PhaseFlexContainer>
        </FieldWrap>
      </FeatureDataWrap>
    </FeatureBody>
  );
};

export default PhasePlannerView;
